import express from "express";
import {
  getSystemAuditLogs,
  getComputerAuditLogs,
  getComputerAuditLogById,
  getSoftwareAuditLogs,
  getSoftwareAuditLogById,
  getPrinterAuditLogs,
  getPrinterAuditLogById,
  getUpsAuditLogs,
  getUpsAuditLogById,
  getNetworkDeviceAuditLogs,
  getNetworkDeviceAuditLogById,
  getPurchaseRequestAuditLogs,
  getUserAuditLogs,
  getUserAuditLogById,
  getEndUserAuditLogs,
  getEndUserAuditLogById,
} from "../controllers/audit.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = express.Router();

const auditAccess = [
  authenticate,
  authorize({ roles: ["IT Manager", "IT Supervisor"] }),
];

// TODO: Per-asset audit visibility permissions (1–6) are defined in the
// permission matrix but a unified audit log listing endpoint has no single
// matching permission. Gating by role until a dedicated permission or a
// query-param-based per-asset approach is implemented.

// System (non-asset) audit trail — Login, Register, End User, Manage PR,
// Generate Report, and File Maintenance related interactions.
router.get("/system", ...auditAccess, getSystemAuditLogs);

// Per-asset-type audit trail listings and per-record audit history.
router.get("/computer", ...auditAccess, getComputerAuditLogs);
router.get("/computer/:id", ...auditAccess, getComputerAuditLogById);

router.get("/software", ...auditAccess, getSoftwareAuditLogs);
router.get("/software/:id", ...auditAccess, getSoftwareAuditLogById);

router.get("/printer", ...auditAccess, getPrinterAuditLogs);
router.get("/printer/:id", ...auditAccess, getPrinterAuditLogById);

router.get("/ups", ...auditAccess, getUpsAuditLogs);
router.get("/ups/:id", ...auditAccess, getUpsAuditLogById);

router.get("/network-device", ...auditAccess, getNetworkDeviceAuditLogs);
router.get("/network-device/:id", ...auditAccess, getNetworkDeviceAuditLogById);

// Purchase request audit trail — covers both header-level (Add/Update
// Purchase Request) and item-level (Add/Update/Delete Purchase Request
// Item) interactions, since item-level events share the parent PR's
// target_id rather than having a per-record endpoint of their own.
router.get("/purchase-request", ...auditAccess, getPurchaseRequestAuditLogs);

// System user audit trail — account creation, field-level edits (email,
// role, status), and permission grants/revokes, all logged against
// target_table = "user".
router.get("/user", ...auditAccess, getUserAuditLogs);
router.get("/user/:id", ...auditAccess, getUserAuditLogById);

// End user audit trail — covers both creation paths (dedicated POST
// /end-user endpoint and silent auto-registration via asset assignment),
// edits, and status changes, all logged against target_table = "end_user".
router.get("/end-user", ...auditAccess, getEndUserAuditLogs);
router.get("/end-user/:id", ...auditAccess, getEndUserAuditLogById);

export default router;
