import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  updatePassword,
  resetPassword,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = express.Router();

router.patch("/password", authenticate, updatePassword);

router.get(
  "/",
  authenticate,
  authorize({ permissions: [8], roles: ["IT Manager", "IT Supervisor"] }),
  getUsers,
);
router.get(
  "/:id",
  authenticate,
  authorize({ permissions: [8], roles: ["IT Manager", "IT Supervisor"] }),
  getUser,
);
router.patch(
  "/:id",
  authenticate,
  authorize({ permissions: [38], roles: ["IT Manager", "IT Supervisor"] }),
  updateUser,
);
router.patch(
  "/:id/reset-password",
  authenticate,
  authorize({ permissions: [41], roles: ["IT Manager", "IT Supervisor"] }),
  resetPassword,
);

export default router;
