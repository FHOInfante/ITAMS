import { Router } from "express";
import {
  addVendor,
  editVendor,
  fetchVendors,
} from "../controllers/vendor.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchVendors);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [19], roles: ["IT Manager", "IT Supervisor"] }),
  addVendor,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [35], roles: ["IT Manager", "IT Supervisor"] }),
  editVendor,
);

export default router;
