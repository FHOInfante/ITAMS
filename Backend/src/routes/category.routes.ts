import { Router } from "express";
import {
  fetchCategoryOptions,
  addCategory,
  editCategoryStatus,
} from "../controllers/category.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchCategoryOptions);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [18], roles: ["IT Manager", "IT Supervisor"] }),
  addCategory,
);
router.patch(
  "/:id",
  authenticate,
  authorize({ permissions: [34], roles: ["IT Manager", "IT Supervisor"] }),
  editCategoryStatus,
);

export default router;
