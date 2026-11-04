/**
 * Optional femininity estimate. The UI only calls this after the person turns
 * the estimate on in Settings. The result is computed on the fly and never stored.
 *
 * It is a transparent heuristic, not a trained model. A recording's median
 * speaking pitch and its resonance (formant spacing) are each placed on a
 * logistic curve centred between published averages for adult speakers, and
 * the two are averaged in log-odds space.
 *
 * Reference points (approximate, from widely cited literature):
 *  - Average speaking pitch is around 120 Hz for adult men and 210 Hz for adult
 *    women (e.g. Baken & Orlikoff, 2000; Titze, 1994).
 *  - Average F1–F3 of American English vowels (Hillenbrand et al., 1995) give a
 *    formant spacing of about 1000 Hz for men and 1170 Hz for women.
 *  - Pitch and formant frequencies both contribute substantially to perceived
 *    speaker gender (e.g. Hillenbrand & Clark, 2009), so they are weighted equally.
 *
 * The constants were set by hand from these reference points rather than fitted
 * to listener judgements, and the underlying research mostly studied cisgender
 * English speakers. Intonation, vocal weight, articulation, microphones and rooms
 * all affect real perception but are not modelled. Treat the result as a rough
 * guide with a wide margin.
 */
import { semitonesBetween } from '../audio/pitchMath';
import type { PitchSummary } from '../audio/pitchTrack';
import type { ResonanceSummary } from '../audio/resonance';

export const FEMININITY_MODEL = {
  /** Halfway (log-scale) between the average pitches above. */
  pitchMidpointHz: 160,
  /** Semitones per logistic unit: ≈120 Hz scores about 10, ≈210 Hz about 90. */
  pitchSemitonesPerUnit: 2.2,
  /** Halfway between the average formant spacings above. */
  resonanceMidpointHz: 1085,
  /** Hz per logistic unit: ≈1000 Hz scores about 15, ≈1170 Hz about 85. */
  resonanceHzPerUnit: 50,
  pitchWeight: 0.5,
  /** Below this much voiced speech there is too little to go on. */
  minVoicedSeconds: 2,
  minResonanceFrames: 20,
  /** LPC formant estimates get less reliable for higher voices. */
  reliablePitchLimitHz: 280,
} as const;

export interface FemininityEstimate {
  /** 0 (more masculine-leaning) … 100 (more feminine-leaning). */
  score: number;
  /** Plausible range around the score. */
  low: number;
  high: number;
  /** Where pitch alone would place this recording (0 … 100). */
  pitchScore: number;
  /** Where resonance alone would place this recording (0 … 100). */
  resonanceScore: number;
  /** True when the recording was short or the measurements less reliable. */
  lowConfidence: boolean;
}

export type FemininityResult =
  | { status: 'ok'; estimate: FemininityEstimate }
  | { status: 'not-enough-speech' }
  | { status: 'no-resonance' };

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const toScore = (x: number) => Math.round(100 * logistic(x));

export function estimateFemininity(
  pitch: PitchSummary | null,
  resonance: ResonanceSummary | null,
): FemininityResult {
  const model = FEMININITY_MODEL;
  if (!pitch || pitch.voicedSeconds < model.minVoicedSeconds) return { status: 'not-enough-speech' };
  if (!resonance || resonance.frames < model.minResonanceFrames) return { status: 'no-resonance' };

  const pitchUnits = semitonesBetween(model.pitchMidpointHz, pitch.medianHz) / model.pitchSemitonesPerUnit;
  const resonanceUnits = (resonance.formantSpacingHz - model.resonanceMidpointHz) / model.resonanceHzPerUnit;
  const combined = model.pitchWeight * pitchUnits + (1 - model.pitchWeight) * resonanceUnits;

  const lowConfidence =
    pitch.voicedSeconds < 5 || resonance.frames < 60 || pitch.medianHz > model.reliablePitchLimitHz;

  // The margin is in log-odds units, so it narrows near the ends of the scale.
  // It always includes model uncertainty, plus more for short recordings.
  const margin =
    0.45 +
    0.4 * Math.sqrt(model.minVoicedSeconds / Math.max(pitch.voicedSeconds, model.minVoicedSeconds)) +
    (lowConfidence ? 0.25 : 0);

  return {
    status: 'ok',
    estimate: {
      score: toScore(combined),
      low: toScore(combined - margin),
      high: toScore(combined + margin),
      pitchScore: toScore(pitchUnits),
      resonanceScore: toScore(resonanceUnits),
      lowConfidence,
    },
  };
}
