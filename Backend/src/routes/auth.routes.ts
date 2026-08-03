import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.post(
  "/register",
  authenticate,
  authorize({
    permissions: [21],
    roles: ["IT Manager", "IT Supervisor"],
    freshCheck: true,
  }),
  register,
);
router.post("/login", login);

export default router;
