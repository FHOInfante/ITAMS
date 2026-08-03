import { Router } from "express";
import {
  addSoftware,
  assignSoftware,
  editSoftware,
  fetchSoftware,
  fetchSoftwareById,
} from "../controllers/software.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchSoftware);
router.get("/:id", authenticate, fetchSoftwareById);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [10], roles: ["IT Manager", "IT Supervisor"] }),
  addSoftware,
);
router.patch(
  "/:id/assign",
  authenticate,
  authorize({ permissions: [23], roles: ["IT Manager", "IT Supervisor"] }),
  assignSoftware,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [25], roles: ["IT Manager", "IT Supervisor"] }),
  editSoftware,
);

export default router;
