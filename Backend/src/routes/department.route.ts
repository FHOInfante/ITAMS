import { Router } from "express";
import {
  addDepartment,
  editDepartment,
  fetchDepartments,
} from "../controllers/department.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchDepartments);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [15], roles: ["IT Manager", "IT Supervisor"] }),
  addDepartment,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [31], roles: ["IT Manager", "IT Supervisor"] }),
  editDepartment,
);

export default router;
