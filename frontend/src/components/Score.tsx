import { scoreColor, safetyLabel } from '../domain';

export function Score({
  score,
  count,
  compact = false,
}: {
  score: number | null;
  count: number;
  compact?: boolean;
}) {
  return (
    <div className={`score ${compact ? 'score-compact' : ''}`}>
      <div
        className="score-number"
        style={{
          color: scoreColor(score),
          borderColor: `${scoreColor(score)}30`,
          background: `${scoreColor(score)}12`,
        }}
      >
        {score === null ? '—' : score.toFixed(1)}
        {!compact && <span>/ 10</span>}
      </div>
      <div>
        <strong>{safetyLabel(score)}</strong>
        <p>
          {count} community {count === 1 ? 'rating' : 'ratings'}
        </p>
      </div>
    </div>
  );
}
