import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

router.get("/me", authenticate, me);
router.post(
  "/register",
  authenticate,
  authorize({ 
    permissions: [1, 2, 3, 4, 5, 6], 
    roles: ["IT Manager", "IT Supervisor"]
    // freshCheck: true,    Removed for Debugging
  }),
  register,
);
router.post("/login", login);

export default router;
