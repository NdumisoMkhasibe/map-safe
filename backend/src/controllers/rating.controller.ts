// src/controllers/rating.controller.ts

import { Request, Response } from "express";
import { createRating } from "../services/rating.service";

/**
 * Handle POST /ratings
 */
export async function addRating(req: Request, res: Response) {
  try {
    const { userId, locationId, score, comment } = req.body;

    if (!userId || !locationId || !score) {
      return res.status(400).json({
        error: "userId, locationId and score are required",
      });
    }

    if (score < 1 || score > 10) {
      return res.status(400).json({
        error: "score must be between 1 and 10",
      });
    }

    const rating = await createRating({
      userId,
      locationId,
      score,
      comment,
    });

    return res.status(201).json(rating);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create rating",
    });
  }
}