/**
 * YIN fundamental-frequency (pitch) estimator.
 *
 * de Cheveigné, A. & Kawahara, H. (2002). "YIN, a fundamental frequency
 * estimator for speech and music." J. Acoust. Soc. Am. 111(4), 1917–1930.
 *
 * Implemented steps (numbering from the paper):
 *  2. difference function            d(τ) = Σ (x[j] − x[j+τ])²
 *  3. cumulative mean normalisation  d′(τ) = d(τ) · τ / Σ_{k=1..τ} d(k)
 *  4. absolute threshold             voiced only if the deepest dip is below the threshold
 *  5. parabolic interpolation        sub-sample estimate of the minimum
 * Step 6 ("best local estimate") is replaced by smoothing the pitch track
 * afterwards (see pitchTrack.ts).
 *
 * Step 4 deviates from the paper. Taking the *first* dip below the threshold
 * fails when a formant sits on a harmonic: a 200 Hz voice with a strong first
 * formant near 600 Hz has an early dip at a third of the period and reads as
 * 600 Hz. Instead we take the earliest dip that is nearly as deep as the
 * deepest one. That still prefers the true period over its multiples, which
 * avoids octave-down errors as well.
 */

export interface YinOptions {
  /** Largest normalised difference accepted as "voiced". Lower is stricter. */
  threshold?: number;
  /** Lowest detectable frequency in Hz. Determines the largest lag searched. */
  minFrequency?: number;
  /** Highest detectable frequency in Hz. Determines the smallest lag searched. */
  maxFrequency?: number;
}

export interface PitchEstimate {
  /** Estimated fundamental frequency in Hz. */
  frequency: number;
  /** 1 − d′(τ) at the chosen lag, in [0, 1]: closer to 1 means more clearly periodic. */
  clarity: number;
}

export const DEFAULT_YIN_OPTIONS = {
  threshold: 0.2,
  minFrequency: 60,
  maxFrequency: 1000,
} as const satisfies Required<YinOptions>;

/** How much shallower than the deepest dip an earlier dip may be and still be chosen. */
const DIP_MARGIN = 0.06;

/** Frame length (in samples) needed to detect `minFrequency`: two full periods. */
export function yinFrameSize(
  sampleRate: number,
  minFrequency: number = DEFAULT_YIN_OPTIONS.minFrequency,
): number {
  return 2 * Math.ceil(sampleRate / minFrequency);
}

export type PitchDetector = (frame: Float32Array) => PitchEstimate | null;

/**
 * Creates a detector bound to a sample rate. It reuses one scratch buffer, so
 * it is cheap to call on every animation frame.
 */
export function createYinDetector(sampleRate: number, options: YinOptions = {}): PitchDetector {
  const threshold = options.threshold ?? DEFAULT_YIN_OPTIONS.threshold;
  const minFrequency = options.minFrequency ?? DEFAULT_YIN_OPTIONS.minFrequency;
  const maxFrequency = options.maxFrequency ?? DEFAULT_YIN_OPTIONS.maxFrequency;

  if (!(sampleRate > 0)) throw new RangeError('sampleRate must be positive');
  if (!(minFrequency > 0 && maxFrequency > minFrequency)) {
    throw new RangeError('expected 0 < minFrequency < maxFrequency');
  }

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const tauLimit = Math.ceil(sampleRate / minFrequency);
  const cmnd = new Float32Array(tauLimit + 2);

  return function detect(frame: Float32Array): PitchEstimate | null {
    const tauMax = Math.min(tauLimit, Math.floor(frame.length / 2));
    if (tauMax <= tauMin + 1) return null;
    const windowSize = frame.length - tauMax;

    cmnd[0] = 1;
    let runningSum = 0;
    let deepest = -1;

    for (let tau = 1; tau <= tauMax; tau++) {
      let difference = 0;
      for (let i = 0; i < windowSize; i++) {
        const delta = frame[i]! - frame[i + tau]!;
        difference += delta * delta;
      }
      runningSum += difference;
      const normalised = runningSum > 0 ? (difference * tau) / runningSum : 1;
      cmnd[tau] = normalised;
      if (tau >= tauMin && (deepest === -1 || normalised < cmnd[deepest]!)) deepest = tau;
    }

    // Voicing decision: is there any clearly periodic lag at all?
    if (deepest === -1 || cmnd[deepest]! >= threshold) return null;

    // The earliest dip that is nearly as deep as the deepest one, followed to its local minimum.
    const acceptance = Math.min(threshold, cmnd[deepest]! + DIP_MARGIN);
    let candidate = deepest;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmnd[tau]! < acceptance) {
        while (tau + 1 <= tauMax && cmnd[tau + 1]! < cmnd[tau]!) tau++;
        candidate = tau;
        break;
      }
    }

    let refinedTau = candidate;
    if (candidate + 1 <= tauMax) {
      const before = cmnd[candidate - 1]!;
      const at = cmnd[candidate]!;
      const after = cmnd[candidate + 1]!;
      const curvature = before - 2 * at + after;
      if (curvature > 0) refinedTau = candidate + (before - after) / (2 * curvature);
    }

    return {
      frequency: sampleRate / refinedTau,
      clarity: Math.min(1, Math.max(0, 1 - cmnd[candidate]!)),
    };
  };
}

/** One-off convenience wrapper around {@link createYinDetector}. */
export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  options?: YinOptions,
): PitchEstimate | null {
  return createYinDetector(sampleRate, options)(frame);
}
