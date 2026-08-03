import { Request, Response } from "express";
import {
  viewSystemAuditLogs,
  viewAssetAuditLogs,
  viewAssetAuditLogsById,
  viewPurchaseRequestAuditLogs,
} from "../models/auditlog.model.js";
import { buildBizBoxRowsForLogs } from "../utils/audit.util.js";

/**
 * Parses the repeatable "type" query parameter into a validated string array.
 * Returns undefined if the parameter was not supplied at all. Throws a
 * descriptive error if the parameter was supplied but every value was blank.
 */
const parseTypeFilter = (rawType: unknown): string[] | undefined => {
  if (rawType === undefined) return undefined;

  const rawArray = Array.isArray(rawType) ? rawType : [rawType];
  const types = rawArray
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0);

  if (types.length === 0) {
    throw new Error("Invalid query: 'type' must not be empty");
  }

  return types;
};

/**
 * Fetches all non-asset ("system") audit log entries: Login, Register, End
 * User Add/Edits, Manage PR, Generate Report, and File Maintenance
 * (Category, Vendor, Department, Peripheral, Program) related interactions.
 * Optionally filtered by one or more interaction_type values via ?type=.
 */
export const getSystemAuditLogs = async (req: Request, res: Response) => {
  try {
    let types: string[] | undefined;
    try {
      types = parseTypeFilter(req.query.type);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }

    const logs = await viewSystemAuditLogs(types);

    if (logs.length === 0) {
      return res.status(200).json({ message: "No audit logs found", data: [] });
    }

    return res.status(200).json(buildBizBoxRowsForLogs(logs));
  } catch (error) {
    console.error("Fetch System Audit Logs Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Returns all audit trail entries for a given asset target_table, formatted
 * as BizBox-style rows (one row per individually changed field).
 */
const getAssetAuditLogs = async (
  req: Request,
  res: Response,
  targetTable: string,
) => {
  try {
    const logs = await viewAssetAuditLogs(targetTable);

    if (logs.length === 0) {
      return res.status(200).json({ message: "No audit logs found", data: [] });
    }

    return res.status(200).json(buildBizBoxRowsForLogs(logs));
  } catch (error) {
    console.error(`Fetch Asset Audit Logs Error [${targetTable}]:`, error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Returns all audit trail entries for one specific asset record, identified
 * by the combination of target_table and the :id path parameter, formatted
 * as BizBox-style rows.
 */
const getAssetAuditLogsById = async (
  req: Request,
  res: Response,
  targetTable: string,
) => {
  const targetId = Number(req.params.id);

  if (!targetId) {
    return res.status(400).json({ message: "Missing asset ID" });
  }

  try {
    const logs = await viewAssetAuditLogsById(targetTable, targetId);

    if (logs.length === 0) {
      return res
        .status(200)
        .json({ message: "No audit logs found for this asset", data: [] });
    }

    return res.status(200).json(buildBizBoxRowsForLogs(logs));
  } catch (error) {
    console.error(
      `Fetch Asset Audit Logs By ID Error [${targetTable}]:`,
      error,
    );
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Returns the full audit trail for purchase requests, formatted as
 * BizBox-style rows. This includes both header-level interactions
 * (Add/Update Purchase Request) and item-level interactions
 * (Add/Update/Delete Purchase Request Item) across every purchase request
 * in the system, since item-level events are logged against their parent
 * PR's target_id rather than a separate target_table.
 */
export const getPurchaseRequestAuditLogs = async (
  req: Request,
  res: Response,
) => {
  try {
    const logs = await viewPurchaseRequestAuditLogs();

    if (logs.length === 0) {
      return res.status(200).json({ message: "No audit logs found", data: [] });
    }

    return res.status(200).json(buildBizBoxRowsForLogs(logs));
  } catch (error) {
    console.error("Fetch Purchase Request Audit Logs Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getComputerAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "computer");
export const getComputerAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "computer");

export const getSoftwareAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "software");
export const getSoftwareAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "software");

export const getPrinterAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "printer");
export const getPrinterAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "printer");

export const getUpsAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "ups");
export const getUpsAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "ups");

export const getNetworkDeviceAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "network_device");
export const getNetworkDeviceAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "network_device");

// System user (target_table = "user") audit trail — covers account
// creation ("Add System User"), field-level edits ("Update System User":
// email, role, status), and permission changes ("Grant Permission",
// "Revoke Permission"), since all four now log against the affected
// user's user_id rather than as snapshot-less system events.
export const getUserAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "user");
export const getUserAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "user");

// End user (target_table = "end_user") audit trail — covers registration
// via the dedicated POST /end-user endpoint, edits via PATCH /end-user/:id,
// and status changes via PATCH /end-user/:id/status, all logged as either
// "Add End User" (creation - one row per populated field) or
// "Update End User" (one row per field that actually changed, including
// eu_status). Also covers end users silently auto-registered through asset
// assignment (e.g. assigning a computer/software license to an employee ID
// with no existing end_user record) - see resolveEndUserAssignment in
// enduser.util.ts - which logs the same "Add End User" interaction_type
// against target_table = "end_user" so both creation paths appear
// identically in this trail.
export const getEndUserAuditLogs = (req: Request, res: Response) =>
  getAssetAuditLogs(req, res, "end_user");
export const getEndUserAuditLogById = (req: Request, res: Response) =>
  getAssetAuditLogsById(req, res, "end_user");
