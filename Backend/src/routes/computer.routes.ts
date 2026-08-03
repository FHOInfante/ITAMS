import { Router } from "express";
import {
  addComputer,
  assignComputer,
  editComputer,
  patchComputerNetwork,
  fetchComputers,
  fetchComputer,
} from "../controllers/computer.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchComputers);
router.get("/:id", authenticate, fetchComputer);
router.post(
  "/",
  authenticate,
  authorize({
    permissions: [9],
    roles: ["IT Manager", "IT Supervisor", "IT Helpdesk"],
  }),
  addComputer,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [24], roles: ["IT Manager", "IT Supervisor"] }),
  editComputer,
);
router.patch(
  "/:id/assign",
  authenticate,
  authorize({
    permissions: [22],
    roles: ["IT Manager", "IT Supervisor", "IT Helpdesk"],
  }),
  assignComputer,
);
router.patch(
  "/:id/network",
  authenticate,
  authorize({
    permissions: [29],
    roles: ["IT Manager", "IT Supervisor", "Network Admin"],
  }),
  patchComputerNetwork,
);

export default router;
