import { Router } from "express";
import { syncProfile } from "../controllers/authController.js";
import { requireAuth } from "../utils/authMiddleware.js";

const router = Router();

router.post("/sync-profile", requireAuth, syncProfile);

export default router;
