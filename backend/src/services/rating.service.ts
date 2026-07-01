// src/services/rating.service.ts

import { prisma } from "../prisma/client";

/**
 * Create a new safety rating
 */
export async function createRating(data: {
  userId: string;
  locationId: string;
  score: number;
  comment?: string;
}) {
  const rating = await prisma.rating.create({
    data: {
      userId: data.userId,
      locationId: data.locationId,
      score: data.score,
      comment: data.comment,
    },
  });

  return rating;
}