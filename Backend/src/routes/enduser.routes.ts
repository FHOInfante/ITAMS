import { Router } from "express";
import {
  addEndUser,
  editEndUser,
  fetchEndUsers,
  fetchEndUserById,
  updateStatus,
} from "../controllers/enduser.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchEndUsers);
router.get("/:id", authenticate, fetchEndUserById);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [20], roles: ["IT Manager", "IT Supervisor"] }),
  addEndUser,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [36], roles: ["IT Manager", "IT Supervisor"] }),
  editEndUser,
);
router.patch(
  "/:id/status",
  authenticate,
  authorize({ permissions: [36], roles: ["IT Manager", "IT Supervisor"] }),
  updateStatus,
);

export default router;
