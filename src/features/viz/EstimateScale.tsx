interface EstimateScaleProps {
  /** 0 … 100 */
  score: number;
  low?: number;
  high?: number;
  startLabel: string;
  endLabel: string;
  /** Accessible description of the whole figure. */
  summary: string;
  size?: 'lg' | 'sm';
}

/**
 * A position on a 0–100 scale with an optional likely range. The track is
 * deliberately neutral: no pink/blue poles, just a calm lavender marker.
 */
export function EstimateScale({ score, low, high, startLabel, endLabel, summary, size = 'lg' }: EstimateScaleProps) {
  const large = size === 'lg';
  return (
    <div role="img" aria-label={summary}>
      <div className={`relative rounded-full bg-surface-muted ring-1 ring-line ${large ? 'h-3' : 'h-1.5'}`}>
        {low !== undefined && high !== undefined && (
          <div
            className="absolute inset-y-0 rounded-full bg-accent/25"
            style={{ left: `${low}%`, width: `${Math.max(1, high - low)}%` }}
          />
        )}
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface ${
            large ? 'size-4' : 'size-3'
          }`}
          style={{ left: `${score}%` }}
        />
      </div>
      {large && (
        <div aria-hidden className="mt-2 flex justify-between gap-4 text-xs text-ink-muted">
          <span>{startLabel}</span>
          <span className="text-right">{endLabel}</span>
        </div>
      )}
    </div>
  );
}
