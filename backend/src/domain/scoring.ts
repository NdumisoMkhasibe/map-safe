export const DAY_MS = 86_400_000;
export type ScoredReport = { id: string; score: number; createdAt: Date };

export function safetyLabel(score: number | null): string {
  if (score === null) return 'No reports yet';
  if (score <= 2) return 'Very low reported risk';
  if (score <= 4) return 'Lower reported risk';
  if (score <= 6) return 'Mixed experiences';
  if (score <= 8) return 'Elevated reported risk';
  return 'Very high reported risk';
}

/** Subtracting the youngest age preserves ratios while preventing numerical underflow. */
export function calculateScore(reports: ScoredReport[], now: Date, halfLife = 180) {
  if (!Number.isFinite(halfLife) || halfLife <= 0) throw new Error('Half-life must be positive');
  const unique = [...new Map(reports.map((rating) => [rating.id, rating])).values()];
  for (const rating of unique) {
    if (
      !Number.isInteger(rating.score) ||
      rating.score < 1 ||
      rating.score > 10 ||
      !Number.isFinite(rating.createdAt.getTime())
    )
      throw new Error('Invalid rating');
  }
  if (unique.length === 0) return { score: null, ratingCount: 0, label: safetyLabel(null) };
  const ages = unique.map((r) => Math.max(0, (now.getTime() - r.createdAt.getTime()) / DAY_MS));
  const youngest = Math.min(...ages);
  let weighted = 0;
  let totalWeight = 0;
  unique.forEach((rating, index) => {
    const weight = Math.pow(0.5, (ages[index] - youngest) / halfLife);
    weighted += rating.score * weight;
    totalWeight += weight;
  });
  const score = Math.round((weighted / totalWeight) * 100) / 100;
  return { score, ratingCount: unique.length, label: safetyLabel(score) };
}
