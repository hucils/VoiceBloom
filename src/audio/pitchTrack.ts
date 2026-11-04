/**
 * Post-processing and summary statistics for a pitch track: one value per
 * analysis frame, in Hz, or `null` where no clear pitch was found (silence,
 * breath, consonants).
 */
import { semitonesBetween } from './pitchMath';
import { median, quantileSorted, standardDeviation } from './stats';

export type PitchTrack = ReadonlyArray<number | null>;

/**
 * Replaces each voiced frame by the median of the voiced frames within
 * ±`radius`, removing isolated spikes such as octave jumps. Unvoiced frames
 * stay unvoiced.
 */
export function medianSmooth(track: PitchTrack, radius = 2): Array<number | null> {
  const window: number[] = [];
  return track.map((value, index) => {
    if (value === null) return null;
    window.length = 0;
    const start = Math.max(0, index - radius);
    const end = Math.min(track.length - 1, index + radius);
    for (let i = start; i <= end; i++) {
      const neighbour = track[i];
      if (neighbour !== null && neighbour !== undefined) window.push(neighbour);
    }
    return median(window);
  });
}

/**
 * Drops frames that leap far from their neighbourhood. These appear where the
 * analysis window straddles voice and silence (the start or end of a phrase)
 * and locks onto a ringing formant instead of the pitch. Each voiced frame is
 * compared with the median of the voiced frames within ±`radius`, excluding
 * itself; even fast sirens move far less than `maxSemitones` in that time.
 */
export function removeOutliers(track: PitchTrack, radius = 5, maxSemitones = 5): Array<number | null> {
  return track.map((value, index) => {
    if (value === null) return null;
    const neighbours: number[] = [];
    for (let i = Math.max(0, index - radius); i <= Math.min(track.length - 1, index + radius); i++) {
      const neighbour = track[i];
      if (i !== index && neighbour !== null && neighbour !== undefined) neighbours.push(neighbour);
    }
    if (neighbours.length < 2) return value;
    return Math.abs(semitonesBetween(median(neighbours), value)) > maxSemitones ? null : value;
  });
}

/** Marks voiced runs shorter than `minLength` frames as unvoiced (stray blips in noise). */
export function removeShortRuns(track: PitchTrack, minLength = 3): Array<number | null> {
  const result = [...track];
  let runStart = -1;
  for (let i = 0; i <= result.length; i++) {
    const voiced = i < result.length && result[i] !== null;
    if (voiced && runStart === -1) runStart = i;
    if (!voiced && runStart !== -1) {
      if (i - runStart < minLength) result.fill(null, runStart, i);
      runStart = -1;
    }
  }
  return result;
}

/**
 * Descriptive pitch statistics. These describe a recording; they are not a
 * score, a target, or an indication of how a voice "should" sound.
 */
export interface PitchSummary {
  /** Middle of the pitch distribution (50th percentile), in Hz. */
  medianHz: number;
  /** 10th percentile: lower edge of the typical range, in Hz. */
  lowHz: number;
  /** 90th percentile: upper edge of the typical range, in Hz. */
  highHz: number;
  /** Width of the typical range (low → high) in semitones. */
  rangeSemitones: number;
  /** Standard deviation of pitch around the median, in semitones (how much the melody moves). */
  variationSemitones: number;
  /** Total time with a detected pitch, in seconds. */
  voicedSeconds: number;
  /** Share of frames with a detected pitch, in [0, 1]. */
  voicedRatio: number;
}

export function summarizePitch(track: PitchTrack, frameSeconds: number): PitchSummary | null {
  const voiced: number[] = [];
  for (const value of track) if (value !== null && Number.isFinite(value)) voiced.push(value);
  if (voiced.length === 0) return null;

  voiced.sort((a, b) => a - b);
  const medianHz = quantileSorted(voiced, 0.5);
  const lowHz = quantileSorted(voiced, 0.1);
  const highHz = quantileSorted(voiced, 0.9);
  const relativeSemitones = voiced.map((value) => semitonesBetween(medianHz, value));

  return {
    medianHz,
    lowHz,
    highHz,
    rangeSemitones: semitonesBetween(lowHz, highHz),
    variationSemitones: standardDeviation(relativeSemitones),
    voicedSeconds: voiced.length * frameSeconds,
    voicedRatio: track.length === 0 ? 0 : voiced.length / track.length,
  };
}
