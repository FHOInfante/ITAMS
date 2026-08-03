import { Router } from "express";
import {
  getPermissions,
  grantTemporaryPermission,
  revokePermission,
} from "../controllers/permission.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, getPermissions);
router.post(
  "/grant",
  authenticate,
  authorize({ permissions: [39], roles: ["IT Manager", "IT Supervisor"] }),
  grantTemporaryPermission,
);
router.delete(
  "/revoke",
  authenticate,
  authorize({ permissions: [40], roles: ["IT Manager", "IT Supervisor"] }),
  revokePermission,
);

export default router;
