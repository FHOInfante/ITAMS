import { Request, Response } from "express";
import bcrypt from "bcrypt";

import {
  updateUser as updateUserRecord,
  updateUserPassword,
  getUserDetails,
  findUserById,
  findUserByEmail,
} from "../models/user.model.js";
import { revokeAllUserPermissions } from "../models/permission.model.js";
import { createAuditLogWithSnapshot } from "../models/auditlog.model.js";
import {
  handleUserPermissionsByRole,
  VALID_ROLES,
} from "../utils/permission.util.js";
import { parsePermissions } from "../utils/user.util.js";
import { sanitizeUserSnapshot } from "../utils/audit.util.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The system-wide default password. Kept as a single named constant instead
// of an inline literal so both callers below (and any future caller) always
// fall back to the exact same value, and so it only needs to change in one
// place.
const DEFAULT_PASSWORD = "Tmcsl@12345";

// Hashes DEFAULT_PASSWORD and writes it to the target user's credential
// record, flagging it as a default password (is_password_default = true).
// This is a controller-level helper — deliberately NOT placed in user.util.ts
// — because it performs DB access (via updateUserPassword) and depends on
// bcrypt, both of which fall outside the "pure helper, no HTTP/DB
// dependency" contract that util files are held to in this project.
//
// Shared by:
//   - resetPassword: an explicit, admin-triggered password reset.
//   - updateUser: an implicit reset applied whenever an account is
//     deactivated (see updateUser below for the rationale).
const setDefaultPassword = async (userId: number): Promise<void> => {
  const hashedDefault = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await updateUserPassword(userId, hashedDefault, true);
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await getUserDetails();

    const formattedUsers = users.map((user) => ({
      user_id: user.user_id,
      user_name: user.user_name,
      user_email: user.user_email,
      user_emp_id: user.user_emp_id,
      user_username: user.user_username,
      user_role: user.user_role,
      user_status: user.user_status,
      permissions: parsePermissions(user.permissions),
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ message: "Missing user ID" });
  }

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user_id: user.user_id,
      user_name: user.user_name,
      user_email: user.user_email,
      user_emp_id: user.user_emp_id,
      user_username: user.user_username,
      user_role: user.user_role,
      user_status: user.user_status,
      permissions: parsePermissions(user.permissions),
    });
  } catch (error) {
    console.error("Fetch User Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Consolidated replacement for the old updateStatus / updateRole /
// updateUsername / updateDetails handlers. user_username and user_name are
// NOT accepted here: user_username is immutable by design, and user_name has
// been dropped from the editable surface entirely as part of this refactor.
//
// All three accepted fields (user_email, user_role, user_status) are
// optional, but at least one MUST be present. Only the fields actually sent
// are validated and written; omitted fields are left untouched.
export const updateUser = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const userId = Number(req.params.id);
  const { user_email, user_role, user_status } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "Missing user ID" });
  }

  if (
    user_email === undefined &&
    user_role === undefined &&
    user_status === undefined
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (req.user?.user_id === userId) {
    return res
      .status(400)
      .json({ message: "Unauthorized Access: Cannot edit own account" });
  }

  let trimmedEmail: string | null | undefined;

  if (user_email !== undefined) {
    if (user_email === null) {
      trimmedEmail = null;
    } else {
      if (
        typeof user_email !== "string" ||
        !EMAIL_REGEX.test(user_email.trim())
      ) {
        return res.status(400).json({ message: "Invalid user_email value" });
      }
      trimmedEmail = user_email.trim();
    }
  }

  if (user_role !== undefined && !VALID_ROLES.includes(user_role)) {
    return res.status(400).json({
      message: `Invalid role value. Must be one of: ${VALID_ROLES.join(", ")}`,
    });
  }

  if (
    user_status !== undefined &&
    !["Active", "Inactive"].includes(user_status)
  ) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (trimmedEmail) {
      const existingEmail = await findUserByEmail(trimmedEmail);

      if (existingEmail && existingEmail.user_id !== userId) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const snapshotBefore = sanitizeUserSnapshot(user);

    await updateUserRecord(userId, {
      user_email: trimmedEmail,
      user_role,
      user_status,
    });

    // Role side effect: re-syncs the PERMANENT permission set to match the
    // new role (granting what's missing, revoking what's no longer included)
    // and unconditionally clears every currently active TEMPORARY
    // permission, regardless of whether its permission_id also appears in
    // the new role's permanent set. See handleUserPermissionsByRole for the
    // full rationale.
    if (user_role !== undefined) {
      await handleUserPermissionsByRole(userId, user_role);
    }

    // If both user_role and user_status were sent in the same request, the
    // role sync above runs FIRST and the status side effect below runs
    // LAST, making status authoritative over whatever the role sync just
    // set up:
    //   - Inactive wipes every permission (permanent AND temporary) the
    //     role sync may have just granted, and force-resets the password.
    //   - Active re-provisions the permanent permission set from the
    //     EFFECTIVE role (the just-updated user_role if one was sent in
    //     this same request, otherwise the account's existing role).
    const effectiveRole = user_role ?? user.user_role;

    if (user_status !== undefined) {
      if (user_status === "Inactive") {
        await Promise.all([
          revokeAllUserPermissions(userId),
          setDefaultPassword(userId),
        ]);
      } else if (user_status === "Active") {
        await handleUserPermissionsByRole(userId, effectiveRole);
      }
    }

    if (req.user) {
      const updatedUser = await findUserById(userId);
      const snapshotAfter = sanitizeUserSnapshot(updatedUser ?? {});

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update System User",
        `Updated account details of ${user.user_name}.`,
        "user",
        userId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "User updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatePassword = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const userId = req.user?.user_id;
  const { newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await updateUserPassword(userId, hashedPassword, false);

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const resetPassword = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const targetUserId = Number(req.params.id);

  if (!targetUserId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (req.user?.user_id === targetUserId) {
    return res
      .status(400)
      .json({ message: "Unauthorized Access: Cannot reset own password" });
  }

  try {
    const user = await findUserById(targetUserId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await setDefaultPassword(targetUserId);

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
