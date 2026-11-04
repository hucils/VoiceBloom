/** Loudness helpers for level meters and silence detection. */

/** Lowest level we report; anything quieter is treated as silence. */
export const SILENCE_DB = -100;

/** Root-mean-square amplitude of a block of samples (full scale = 1). */
export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  const length = end - start;
  if (length <= 0) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) {
    const sample = samples[i]!;
    sum += sample * sample;
  }
  return Math.sqrt(sum / length);
}

/** Converts a linear amplitude to decibels relative to full scale (dBFS). */
export function amplitudeToDb(amplitude: number): number {
  if (amplitude <= 0) return SILENCE_DB;
  return Math.max(SILENCE_DB, 20 * Math.log10(amplitude));
}

/**
 * Maps a dBFS level onto [0, 1] for a meter, where `floorDb` is empty and
 * 0 dBFS is full.
 */
export function dbToMeterValue(db: number, floorDb = -60): number {
  if (db <= floorDb) return 0;
  if (db >= 0) return 1;
  return (db - floorDb) / -floorDb;
}
