// src/routes/rating.routes.ts

import { Router } from "express";
import { addRating } from "../controllers/rating.controller";

const router = Router();

/**
 * POST /ratings
 */
router.post("/", addRating);

export default router;