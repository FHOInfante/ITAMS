import { Request, Response } from "express";
import {
  createEndUser,
  updateEndUser,
  updateEndUserStatus,
  getEndUsers,
  getEndUserById,
  findEndUserByEmpId,
} from "../models/enduser.model.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";
import { resolveDepartmentId } from "../utils/enduser.util.js";
import {
  buildEndUserSnapshot,
  sanitizeEndUserSnapshot,
} from "../utils/audit.util.js";

const VALID_LOCATIONS = [
  "B2",
  "B1",
  "GF",
  "2F",
  "3F",
  "4F",
  "5F",
  "6F",
  "7F",
  "8F",
  "PO",
] as const;

const VALID_STATUSES = ["Active", "Resigned"] as const;

const isValidLocation = (value: any): boolean =>
  VALID_LOCATIONS.includes(value);

const isValidStatus = (value: any): boolean => VALID_STATUSES.includes(value);

export const addEndUser = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const {
    euName,
    euEmpId,
    euDivision,
    euDepartment,
    euLocation,
    euEmail,
    euContactNo,
  } = req.body;

  if (
    !euName ||
    euEmpId === undefined ||
    !euDivision ||
    euDepartment === undefined ||
    !euLocation
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (
    typeof euEmpId !== "number" ||
    !Number.isInteger(euEmpId) ||
    euEmpId <= 0
  ) {
    return res.status(400).json({ message: "Invalid euEmpId value" });
  }

  if (!isValidLocation(euLocation)) {
    return res.status(400).json({
      message: `Invalid euLocation. Must be one of: ${VALID_LOCATIONS.join(", ")}`,
    });
  }

  let resolvedDepartmentId: number;
  try {
    resolvedDepartmentId = await resolveDepartmentId(euDepartment);
  } catch (err: any) {
    return res.status(err.statusCode ?? 400).json({ message: err.message });
  }

  try {
    const endUser = await findEndUserByEmpId(euEmpId);
    if (endUser) {
      return res
        .status(409)
        .json({ message: "An end user with this employee ID already exists" });
    }

    const euId = await createEndUser(
      euName,
      euEmpId,
      euDivision,
      resolvedDepartmentId,
      euLocation,
      euEmail ?? null,
      euContactNo ?? null,
    );

    if (req.user) {
      const snapshotAfter = buildEndUserSnapshot({
        eu_id: euId,
        eu_name: euName,
        eu_emp_id: euEmpId,
        eu_division: euDivision,
        eu_department: resolvedDepartmentId,
        eu_location: euLocation,
        eu_email: euEmail ?? null,
        eu_contact_no: euContactNo ?? null,
        eu_status: "Active",
      });

      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add End User",
        `Added End User. Employee ID: ${euEmpId} Name: ${euName}.`,
        "end_user",
        euId,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(201).json({ message: "End user added successfully" });
  } catch (error) {
    console.error("Add End User Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editEndUser = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const euId = Number(req.params.id);

  if (!euId) {
    return res.status(400).json({ message: "Missing end user ID" });
  }

  const {
    euName,
    euEmpId,
    euDivision,
    euDepartment,
    euLocation,
    euEmail,
    euContactNo,
    euStatus,
  } = req.body;

  if (
    !euName ||
    euEmpId === undefined ||
    !euDivision ||
    euDepartment === undefined ||
    !euLocation ||
    !euStatus
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (
    typeof euEmpId !== "number" ||
    !Number.isInteger(euEmpId) ||
    euEmpId <= 0
  ) {
    return res.status(400).json({ message: "Invalid euEmpId value" });
  }

  if (!isValidLocation(euLocation)) {
    return res.status(400).json({
      message: `Invalid euLocation. Must be one of: ${VALID_LOCATIONS.join(", ")}`,
    });
  }

  if (!isValidStatus(euStatus)) {
    return res.status(400).json({
      message: `Invalid euStatus. Must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  let resolvedDepartmentId: number;
  try {
    resolvedDepartmentId = await resolveDepartmentId(euDepartment);
  } catch (err: any) {
    return res.status(err.statusCode ?? 400).json({ message: err.message });
  }

  try {
    const endUser = await getEndUserById(euId);
    if (!endUser) {
      return res.status(404).json({ message: "End user not found" });
    }

    // Check if the new euEmpId is already taken by a different end user
    if (euEmpId !== endUser.eu_emp_id) {
      const conflict = await findEndUserByEmpId(euEmpId);
      if (conflict) {
        return res.status(409).json({
          message: "An end user with this employee ID already exists",
        });
      }
    }

    await updateEndUser(
      euId,
      euName,
      euEmpId,
      euDivision,
      resolvedDepartmentId,
      euLocation,
      euEmail ?? null,
      euContactNo ?? null,
      euStatus,
    );

    if (req.user) {
      const snapshotAfter = buildEndUserSnapshot({
        eu_id: euId,
        eu_name: euName,
        eu_emp_id: euEmpId,
        eu_division: euDivision,
        eu_department: resolvedDepartmentId,
        eu_location: euLocation,
        eu_email: euEmail ?? null,
        eu_contact_no: euContactNo ?? null,
        eu_status: euStatus,
      });

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update End User",
        `Updated details of end user: ${endUser.eu_name}.`,
        "end_user",
        euId,
        sanitizeEndUserSnapshot(endUser),
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "End user updated successfully" });
  } catch (error) {
    console.error("Update End User Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateStatus = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const euId = Number(req.params.id);
  const { status } = req.body;

  if (!euId || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!isValidStatus(status)) {
    return res.status(400).json({
      message: `Invalid status value. Must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  try {
    const endUser = await getEndUserById(euId);
    if (!endUser) {
      return res.status(404).json({ message: "End user not found" });
    }

    await updateEndUserStatus(euId, status);

    if (req.user) {
      const snapshotBefore = sanitizeEndUserSnapshot(endUser);
      const snapshotAfter = { ...snapshotBefore, eu_status: status };

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update End User",
        `Updated status of end user: ${endUser.eu_name} to ${status}.`,
        "end_user",
        euId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "End user status updated" });
  } catch (error) {
    console.error("Update End User Status Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchEndUsers = async (req: Request, res: Response) => {
  try {
    const endUsers = await getEndUsers();
    return res.status(200).json(endUsers);
  } catch (error) {
    console.error("Fetch End Users Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchEndUserById = async (req: Request, res: Response) => {
  const euId = Number(req.params.id);

  if (!euId) {
    return res.status(400).json({ message: "Missing end user ID" });
  }

  try {
    const endUser = await getEndUserById(euId);

    if (!endUser) {
      return res.status(404).json({ message: "End user not found" });
    }

    return res.status(200).json(endUser);
  } catch (error) {
    console.error("Fetch End User Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
