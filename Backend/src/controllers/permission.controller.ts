import { Request, Response } from "express";
import {
  getPermissionList,
  grantUserPermissions,
  revokeUserPermissions,
  getUserPermission,
  getUserPermissionRecords,
  UserPermissionRecord,
} from "../models/permission.model.js";
import { findUserById } from "../models/user.model.js";
import { createAuditLogWithSnapshot } from "../models/auditlog.model.js";
import { buildPermissionAuditSnapshot } from "../utils/audit.util.js";

// Expected format: YYYY-MM-DD HH:MM:SS
const MYSQL_DATETIME_REGEX =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

const isValidMySQLDatetime = (value: string): boolean => {
  return MYSQL_DATETIME_REGEX.test(value);
};

// Validates that the request body's permission_id is a non-empty array of
// positive integers, capped at 42 entries (the total number of permissions
// defined in the system). Returns the de-duplicated array of valid IDs, or
// null if the input is malformed in a way the caller should reject as 400.
const parsePermissionIdArray = (value: unknown): number[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length > 42) return null;

  const permissionIds: number[] = [];

  for (const entry of value) {
    const permissionId = Number(entry);

    if (!Number.isInteger(permissionId) || permissionId <= 0) {
      return null;
    }

    permissionIds.push(permissionId);
  }

  // Silently de-duplicate so repeated IDs in the payload don't cause
  // duplicate INSERT/DELETE attempts.
  return [...new Set(permissionIds)];
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await getPermissionList();

    return res.status(200).json(permissions);
  } catch (error) {
    console.error("Fetch Permissions Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const grantTemporaryPermission = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const user_id = Number(req.body.user_id);
  const permission_id = parsePermissionIdArray(req.body.permission_id);
  const { validFrom, validTo } = req.body;

  if (!user_id || !permission_id || !validFrom || !validTo) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (req.user?.user_id === user_id) {
    return res
      .status(400)
      .json({ message: "Cannot grant a permission to your own account" });
  }

  if (!isValidMySQLDatetime(validFrom)) {
    return res.status(400).json({
      message: `Invalid validFrom format. Expected: YYYY-MM-DD HH:MM:SS, received: "${validFrom}"`,
    });
  }

  if (!isValidMySQLDatetime(validTo)) {
    return res.status(400).json({
      message: `Invalid validTo format. Expected: YYYY-MM-DD HH:MM:SS, received: "${validTo}"`,
    });
  }

  if (new Date(validTo) <= new Date(validFrom)) {
    return res.status(400).json({
      message: "validTo must be after validFrom",
    });
  }

  try {
    const user = await findUserById(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingPermissions = await getUserPermission(user_id);

    // All-or-nothing: if the user already holds ANY of the requested
    // permission_ids, reject the entire request without granting the rest.
    const alreadyHeld = permission_id.filter((id) =>
      existingPermissions.includes(id),
    );

    if (alreadyHeld.length > 0) {
      return res.status(400).json({
        message: `User already has the following permission(s): ${alreadyHeld.join(", ")}`,
      });
    }

    await grantUserPermissions(user_id, permission_id, validFrom, validTo);

    if (req.user) {
      const snapshotBefore = buildPermissionAuditSnapshot(
        user.user_name,
        existingPermissions,
      );
      const snapshotAfter = buildPermissionAuditSnapshot(user.user_name, [
        ...existingPermissions,
        ...permission_id,
      ]);

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Grant Permission",
        `Granted temporary permission(s): [${permission_id.join(", ")}] to system user: ${user.user_name}. Validity: ${validFrom} to ${validTo}.`,
        "user",
        user_id,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Temporary permission(s) granted successfully" });
  } catch (error) {
    console.error("Grant Permission Error:", error);
    return res.status(500).json({ message: "Failed to grant permission" });
  }
};

export const revokePermission = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const user_id = Number(req.body.user_id);
  const permission_id = parsePermissionIdArray(req.body.permission_id);

  if (!user_id || !permission_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (req.user?.user_id === user_id) {
    return res
      .status(400)
      .json({ message: "Cannot revoke a permission from your own account" });
  }

  try {
    const user = await findUserById(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const permissionRecords: UserPermissionRecord[] =
      await getUserPermissionRecords(user_id, permission_id);

    // All-or-nothing: every requested permission_id must (a) exist on the
    // target user and (b) be temporary. Otherwise the whole request is
    // rejected and nothing is revoked.
    const notHeld = permission_id.filter(
      (id) => !permissionRecords.some((record) => record.permission_id === id),
    );

    if (notHeld.length > 0) {
      return res.status(400).json({
        message: `User does not have the following permission(s): ${notHeld.join(", ")}`,
      });
    }

    const permanent = permissionRecords
      .filter((record) => !record.is_temporary)
      .map((record) => record.permission_id);

    if (permanent.length > 0) {
      return res.status(400).json({
        message: `The following permission(s) are permanent and cannot be revoked: ${permanent.join(", ")}. Permanent permissions must be managed separately.`,
      });
    }

    // Full held set (not just the IDs being revoked) is needed BEFORE the
    // revoke happens, so the audit snapshot can report a complete
    // before/after picture rather than just the revoked subset.
    const existingPermissions = await getUserPermission(user_id);

    await revokeUserPermissions(user_id, permission_id);

    if (req.user) {
      const snapshotBefore = buildPermissionAuditSnapshot(
        user.user_name,
        existingPermissions,
      );
      const remainingPermissions = existingPermissions.filter(
        (id) => !permission_id.includes(id),
      );
      const snapshotAfter = buildPermissionAuditSnapshot(
        user.user_name,
        remainingPermissions,
      );

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Revoke Permission",
        `Revoked temporary permission(s): [${permission_id.join(", ")}] from system user: ${user.user_name}.`,
        "user",
        user_id,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Permission(s) revoked successfully" });
  } catch (error) {
    console.error("Revoke Permission Error:", error);
    return res.status(500).json({ message: "Failed to revoke permission" });
  }
};
