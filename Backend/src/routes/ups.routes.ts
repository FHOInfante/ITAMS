import { Router } from "express";
import {
  addUps,
  editUps,
  fetchUps,
  fetchUpsById,
} from "../controllers/ups.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchUps);
router.get("/:id", authenticate, fetchUpsById);
router.post(
  "/",
  authenticate,
  authorize({
    permissions: [12],
    roles: ["IT Manager", "IT Supervisor", "IT Helpdesk"],
  }),
  addUps,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [27], roles: ["IT Manager", "IT Supervisor"] }),
  editUps,
);

export default router;
