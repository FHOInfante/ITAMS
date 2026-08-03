import { findEndUserByEmpId, createEndUser } from "../models/enduser.model.js";
import {
  getDepartmentById,
  getDepartmentByName,
} from "../models/department.model.js";
import { createAuditLogWithSnapshotAfterOnly } from "../models/auditlog.model.js";
import { buildEndUserSnapshot } from "./audit.util.js";

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
];

export type EndUserAssignPayload = {
  euEmpId: number | null;
  assignedDate?: string | null;
  euName?: string;
  euDivision?: string;
  euDepartment?: number | string;
  euLocation?: string;
  euEmail?: string | null;
  euContactNo?: string | null;
};

export type ResolvedEndUserAssignment = {
  euId: number | null;
  assignedDate: string | null;
};

export const resolveDepartmentId = async (
  euDepartment: number | string | undefined,
): Promise<number> => {
  if (euDepartment === undefined || euDepartment === null) {
    const err = new Error("Missing required fields") as any;
    err.statusCode = 400;
    throw err;
  }

  if (typeof euDepartment === "number") {
    if (!Number.isInteger(euDepartment) || euDepartment <= 0) {
      const err = new Error("Invalid euDepartment value") as any;
      err.statusCode = 400;
      throw err;
    }

    const department = await getDepartmentById(euDepartment);
    if (!department) {
      const err = new Error("Department not found") as any;
      err.statusCode = 404;
      throw err;
    }

    return department.department_id;
  }

  // String path: numeric string treated as ID, otherwise case-insensitive name lookup
  if (typeof euDepartment === "string") {
    const parsed = Number(euDepartment);

    // Numeric string — treat as ID
    if (!isNaN(parsed) && Number.isInteger(parsed) && parsed > 0) {
      const department = await getDepartmentById(parsed);
      if (!department) {
        const err = new Error("Department not found") as any;
        err.statusCode = 404;
        throw err;
      }
      return department.department_id;
    }

    const department = await getDepartmentByName(euDepartment);
    if (!department) {
      const err = new Error("Department not found") as any;
      err.statusCode = 404;
      throw err;
    }

    return department.department_id;
  }

  const err = new Error("Invalid euDepartment value") as any;
  err.statusCode = 400;
  throw err;
};

/**
 * Resolves an end-user assignment for a given euEmpId.
 *
 * Behavior is intentionally split into two mutually-exclusive branches:
 *
 * 1. EXISTING END USER — if euEmpId already belongs to a registered end user,
 *    this function resolves and returns immediately using ONLY euEmpId and
 *    assignedDate. Registration-only fields (euName, euDivision, euDepartment,
 *    euLocation, euEmail, euContactNo) are never read out of `payload` on this
 *    path — they are destructured further down, strictly inside the
 *    "not found" branch. This is a structural guarantee, not just a runtime
 *    check: an existing end user's stored details can never be overwritten
 *    as a side effect of assigning an asset to them, even if a caller sends
 *    a full registration-shaped payload alongside a valid euEmpId.
 *
 * 2. NEW END USER (registration) — only reached when no end user is found
 *    for euEmpId. Registration fields are required here and are used to
 *    create the end user record.
 *
 * When branch 2 creates a new end user, and actingUserId is supplied, an
 * "Add End User" audit entry is logged under target_table = "end_user" -
 * the same interaction_type and snapshot shape as the dedicated
 * POST /end-user endpoint (see enduser.controller.ts's addEndUser), so both
 * paths to creating an end user surface identically in GET /audit/end-user.
 * actingUserId is optional and the audit call is fire-and-forget: callers
 * that don't yet pass it (or don't have an authenticated req.user in scope)
 * simply skip logging rather than failing the asset-assignment request.
 */
export const resolveEndUserAssignment = async (
  payload: EndUserAssignPayload,
  actingUserId?: number,
): Promise<ResolvedEndUserAssignment> => {
  const { euEmpId, assignedDate } = payload;

  if (euEmpId === null || euEmpId === undefined) {
    return { euId: null, assignedDate: null };
  }

  if (!assignedDate) {
    const err = new Error("Missing required fields") as any;
    err.statusCode = 400;
    throw err;
  }

  const existingEndUser = await findEndUserByEmpId(euEmpId);

  // --- Existing end user branch -----------------------------------------
  // Only euEmpId/assignedDate are consulted here. Any euName, euDivision,
  // euDepartment, euLocation, euEmail, or euContactNo present in `payload`
  // are silently ignored — they are simply never read on this path.
  if (existingEndUser) {
    if (existingEndUser.eu_status === "Resigned") {
      const err = new Error(
        "Cannot assign assets to a Resigned end user",
      ) as any;
      err.statusCode = 400;
      throw err;
    }

    return { euId: existingEndUser.eu_id, assignedDate };
  }

  // --- New end user (registration) branch --------------------------------
  // Reached only when euEmpId does not match any existing end user.
  const { euName, euDivision, euDepartment, euLocation, euEmail, euContactNo } =
    payload;

  if (!euName || !euDivision || euDepartment === undefined || !euLocation) {
    const err = new Error(
      "End user not found. Please provide euName, euDivision, euDepartment, and euLocation to register them.",
    ) as any;
    err.statusCode = 400;
    throw err;
  }

  if (!VALID_LOCATIONS.includes(euLocation)) {
    const err = new Error("Invalid location value") as any;
    err.statusCode = 400;
    throw err;
  }

  const resolvedDepartmentId = await resolveDepartmentId(euDepartment);

  const euId = await createEndUser(
    euName,
    euEmpId,
    euDivision,
    resolvedDepartmentId,
    euLocation as
      | "B2"
      | "B1"
      | "GF"
      | "2F"
      | "3F"
      | "4F"
      | "5F"
      | "6F"
      | "7F"
      | "8F"
      | "PO",
    euEmail ?? null,
    euContactNo ?? null,
  );

  if (actingUserId) {
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
      actingUserId,
      "Add End User",
      `Added End User via asset assignment. Employee ID: ${euEmpId} Name: ${euName}.`,
      "end_user",
      euId,
      snapshotAfter,
    ).catch(() => {});
  }

  return { euId, assignedDate };
};
