/**
 * Reduces audio samples to a fixed number of peak values for waveform drawing.
 * Each peak is the largest absolute amplitude in its bucket (0 … 1).
 */
export function computePeaks(samples: Float32Array, bucketCount: number): number[] {
  const count = Math.max(0, Math.floor(bucketCount));
  if (count === 0 || samples.length === 0) return new Array<number>(count).fill(0);

  const peaks = new Array<number>(count);
  const bucketSize = samples.length / count;
  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor(bucket * bucketSize);
    // Short inputs give buckets narrower than one sample; always look at least one.
    const end = Math.max(start + 1, Math.min(samples.length, Math.floor((bucket + 1) * bucketSize)));
    let peak = 0;
    for (let i = start; i < end && i < samples.length; i++) {
      const value = Math.abs(samples[i]!);
      if (value > peak) peak = value;
    }
    peaks[bucket] = Math.min(1, peak);
  }
  return peaks;
}

/** Scales peaks so the loudest is 1, so quiet recordings still read clearly. */
export function normalizePeaks(peaks: readonly number[]): number[] {
  let max = 0;
  for (const peak of peaks) if (peak > max) max = peak;
  if (max === 0) return peaks.map(() => 0);
  return peaks.map((peak) => peak / max);
}
