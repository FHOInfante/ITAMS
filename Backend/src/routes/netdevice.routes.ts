import { Router } from "express";
import {
  addNetworkDevice,
  editNetworkDevice,
  fetchNetworkDevices,
  fetchNetworkDevice,
} from "../controllers/netdevice.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/", authenticate, fetchNetworkDevices);
router.get("/:id", authenticate, fetchNetworkDevice);
router.post(
  "/",
  authenticate,
  authorize({
    permissions: [13],
    roles: ["IT Manager", "IT Supervisor", "Network Admin"],
  }),
  addNetworkDevice,
);
router.put(
  "/:id",
  authenticate,
  authorize({
    permissions: [28],
    roles: ["IT Manager", "IT Supervisor", "Network Admin"],
  }),
  editNetworkDevice,
);

export default router;
