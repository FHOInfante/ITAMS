import { Router } from "express";
import {
  addPrinter,
  editPrinter,
  updatePrinterNetwork,
  fetchPrinters,
  fetchPrinter,
} from "../controllers/printer.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchPrinters);
router.get("/:id", authenticate, fetchPrinter);
router.post(
  "/",
  authenticate,
  authorize({
    permissions: [11],
    roles: ["IT Manager", "IT Supervisor", "IT Helpdesk"],
  }),
  addPrinter,
);
router.put(
  "/:id",
  authenticate,
  authorize({ permissions: [26], roles: ["IT Manager", "IT Supervisor"] }),
  editPrinter,
);
router.patch(
  "/:id/network",
  authenticate,
  authorize({
    permissions: [30],
    roles: ["IT Manager", "IT Supervisor", "Network Admin"],
  }),
  updatePrinterNetwork,
);

export default router;
