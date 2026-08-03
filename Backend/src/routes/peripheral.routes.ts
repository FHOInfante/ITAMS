import { Router } from "express";
import {
  addPeripheral,
  editPeripheral,
  fetchPeripherals,
} from "../controllers/peripheral.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchPeripherals);
router.post(
  "/",
  authenticate,
  authorize({ permissions: [16], roles: ["IT Manager", "IT Supervisor"] }),
  addPeripheral,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [32], roles: ["IT Manager", "IT Supervisor"] }),
  editPeripheral,
);

export default router;
