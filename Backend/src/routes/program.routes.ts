import { Router } from "express";
import {
  addProgram,
  editProgram,
  fetchPrograms,
} from "../controllers/program.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchPrograms);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [17], roles: ["IT Manager", "IT Supervisor"] }),
  addProgram,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [33], roles: ["IT Manager", "IT Supervisor"] }),
  editProgram,
);

export default router;
