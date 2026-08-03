import { Router } from "express";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import {
  downloadComputerReport,
  downloadSoftwareReport,
  downloadUpsReport,
  downloadPrinterReport,
  downloadNetworkDeviceReport,
  downloadEndUserReport,
  downloadAuditReport,
} from "../controllers/report.controller.js";

const router = Router();

router.get(
  "/computer",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadComputerReport,
);
router.get(
  "/software",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadSoftwareReport,
);
router.get(
  "/ups",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadUpsReport,
);
router.get(
  "/printer",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadPrinterReport,
);
router.get(
  "/network-device",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadNetworkDeviceReport,
);
router.get(
  "/end-user",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadEndUserReport,
);
router.get(
  "/audit",
  authenticate,
  authorize({ permissions: [42], roles: ["IT Manager", "IT Supervisor"] }),
  downloadAuditReport,
);

export default router;
