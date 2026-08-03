import { Request, Response } from "express";
import bcrypt from "bcrypt";

import {
  createUser,
  findUserByEmpId,
  findUserById,
} from "../models/user.model.js";
import {
  createCredential,
  findCredentialByUsername,
} from "../models/credential.model.js";
import { getUserPermission } from "../models/permission.model.js";
import { createAuditLogWithSnapshotAfterOnly } from "../models/auditlog.model.js";
import { signToken } from "../utils/jwt.util.js";
import {
  handleUserPermissionsByRole,
  VALID_ROLES,
} from "../utils/permission.util.js";
import { sanitizeUserSnapshot } from "../utils/audit.util.js";

export const register = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  let { name, email, empID, role, username, password } = req.body;

  if (!name || !empID || !role || !username) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({
      message: `Invalid role value. Must be one of: ${VALID_ROLES.join(", ")}`,
    });
  }

  if (!password) {
    password = "Tmcsl@12345";
  }

  try {
    const existingEmpId = await findUserByEmpId(empID);

    if (existingEmpId) {
      return res
        .status(400)
        .json({ message: "User with that employee ID already exists" });
    }

    const existingUsername = await findCredentialByUsername(username);

    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const isDefault = password === "Tmcsl@12345";
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = await createUser(name, email, empID, role);

    await createCredential(userId, username, passwordHash, isDefault);
    await handleUserPermissionsByRole(userId, role);

    if (req.user) {
      const snapshotAfter = await findUserById(userId);
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add System User",
        `Added System User. Name: ${name} Employee ID: ${empID}.`,
        "user",
        userId,
        sanitizeUserSnapshot(snapshotAfter ?? {}),
      ).catch(() => {});
    }

    return res.status(201).json({ message: "Successfully created an account" });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const user = await findCredentialByUsername(username);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.user_status === "Inactive") {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const permissions = await getUserPermission(user.user_id);

    const token = signToken({
      user_id: user.user_id,
      role: user.user_role,
      permissions: permissions,
    });

    return res.status(200).json({
      JWT: token,
      name: user.user_name,
      role: user.user_role,
      permissions,
      is_password_default: Boolean(user.is_password_default),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
