import { Router } from "express";
import {
  addPurchaseRecord,
  addPurchaseRequestItems,
  fetchPurchaseRecords,
  fetchPurchaseRecord,
  editPurchaseRequestStatus,
  editPurchaseRequestItemStatus,
} from "../controllers/purchasereq.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize({
    permissions: [7],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  fetchPurchaseRecords,
);
router.get(
  "/:id",
  authenticate,
  authorize({
    permissions: [7],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  fetchPurchaseRecord,
);
router.post(
  "/",
  authenticate,
  authorize({
    permissions: [14],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  addPurchaseRecord,
);
router.post(
  "/:id",
  authenticate,
  authorize({
    permissions: [14],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  addPurchaseRequestItems,
);

router.patch(
  "/item/:id",
  authenticate,
  authorize({
    permissions: [37],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  editPurchaseRequestItemStatus,
);
router.patch(
  "/:id",
  authenticate,
  authorize({
    permissions: [37],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  editPurchaseRequestStatus,
);

export default router;