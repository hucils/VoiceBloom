/** Small, dependency-free statistics helpers used by the analysis pipeline. */

export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/**
 * Quantile with linear interpolation between closest ranks (the same method as
 * NumPy's default). `q` is in [0, 1]. Returns NaN for an empty input.
 */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return quantileSorted(sorted, q);
}

export function quantileSorted(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const clamped = Math.min(1, Math.max(0, q));
  const position = (sorted.length - 1) * clamped;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const lowerValue = sorted[lower]!;
  const upperValue = sorted[upper]!;
  return lowerValue + (upperValue - lowerValue) * (position - lower);
}

export function median(values: readonly number[]): number {
  return quantile(values, 0.5);
}

export function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const average = mean(values);
  let sumOfSquares = 0;
  for (const value of values) sumOfSquares += (value - average) ** 2;
  return Math.sqrt(sumOfSquares / values.length);
}
