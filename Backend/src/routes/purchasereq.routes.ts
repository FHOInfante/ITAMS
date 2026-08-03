import { Router } from "express";
import {
  addPurchaseRecord,
  addPurchaseRequestItems,
  fetchPurchaseRecords,
  fetchPurchaseRecord,
  editPurchaseRequestStatus,
  editPurchaseRequestItemReceived,
  deletePurchaseRequestItem,
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

// NOTE: "/item/:id" routes must be registered before the generic "/:id"
// PATCH route below, otherwise Express would match "/item/5" against
// "/:id" first (with id = "item") and the item-specific handlers would
// never be reached.
router.patch(
  "/item/:id",
  authenticate,
  authorize({
    permissions: [37],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  editPurchaseRequestItemReceived,
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
router.delete(
  "/item/:id",
  authenticate,
  authorize({
    permissions: [37],
    roles: ["IT Manager", "IT Supervisor", "System Specialist"],
  }),
  deletePurchaseRequestItem,
);

export default router;
