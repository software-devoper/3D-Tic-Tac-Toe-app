import { Router } from "express";
import { aiMove } from "../controllers/aiController.js";

const router = Router();

router.post("/move", aiMove);

export default router;
