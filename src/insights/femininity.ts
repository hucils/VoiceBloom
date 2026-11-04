/**
 * Optional femininity estimate. The UI only calls this after the person turns
 * the estimate on in Settings. The result is computed on the fly and never stored.
 *
 * It is a transparent heuristic, not a trained model. Four measurements are
 * each placed on a logistic curve centred between typical values for adult
 * speakers, then averaged in log-odds space with fixed shares:
 *
 *  - Pitch (35 %): the median speaking pitch. Around 120 Hz for adult men and
 *    210 Hz for adult women (e.g. Baken & Orlikoff, 2000; Titze, 1994).
 *  - Resonance (35 %): the formant spacing. Average F1–F3 of American English
 *    vowels (Hillenbrand et al., 1995) give about 1000 Hz for men and 1170 Hz
 *    for women. Pitch and formants both shape perceived speaker gender
 *    (Hillenbrand & Clark, 2009), so they share the largest part equally, and
 *    pitch alone cannot carry the result.
 *  - Vocal weight (20 %): H1*–H2* (see audio/voiceQuality.ts), about 6 dB
 *    higher on average for women (Henton & Bladon, 1985; Klatt & Klatt, 1990).
 *    After pitch it was the strongest cue to perceived gender in voices varied
 *    at the larynx (Zhang, Zhang & Kreiman, 2022).
 *  - Intonation (10 %): melodic variation in semitones. Listeners tend to hear
 *    a livelier melody as more feminine (Hancock, Colton & Douglas, 2014;
 *    Leung, Oates & Chan, 2018), but speakers' actual melodies differ little
 *    between groups (Hancock et al., 2014; Hardy et al., 2020), so it counts least.
 *
 * Naturalness can lower the estimate but never raises it. In a study of
 * transgender and cisgender speakers, naturalness ratings fell with pitch and
 * rose with formant frequencies; the authors suggest a high pitch sounded
 * unexpected alongside the other cues (Hardy et al., 2020). A mismatch between
 * pitch and spectral shape also leaves listeners unsure of gender (Zhang,
 * Zhang & Kreiman, 2022). So pitch far ahead of resonance or weight counts
 * against naturalness, as do a very flat or exaggerated melody and sudden
 * pitch breaks.
 *
 * The constants were set by hand from these reference points rather than fitted
 * to listener judgements, and the underlying research mostly studied cisgender
 * English speakers. Articulation, speech rate, words, microphones and rooms all
 * affect real perception but are not modelled. Treat the result as a rough
 * guide with a wide margin.
 */
import type { RecordingAnalysis } from '../audio/analysis';
import { semitonesBetween } from '../audio/pitchMath';
import type { PitchSummary } from '../audio/pitchTrack';
import { summarizeProsody, type ProsodySummary } from '../audio/prosody';
import type { ResonanceSummary } from '../audio/resonance';
import type { VoiceQualitySummary } from '../audio/voiceQuality';

export const FEMININITY_MODEL = {
  /** Halfway (log-scale) between the average pitches above. */
  pitchMidpointHz: 160,
  /** Semitones per logistic unit: ≈120 Hz scores about 10, ≈210 Hz about 90. */
  pitchSemitonesPerUnit: 2.2,
  /** Halfway between the average formant spacings above. */
  resonanceMidpointHz: 1085,
  /** Hz per logistic unit: ≈1000 Hz scores about 15, ≈1170 Hz about 85. */
  resonanceHzPerUnit: 50,
  /**
   * Halfway between typical H1*–H2* values, taken as about 1.5 dB for men and
   * 7.5 dB for women. The ≈6 dB gap is published; absolute values depend on
   * how H1–H2 is measured, so the midpoint is hand-set for this measurement.
   * As a sanity check, macOS text-to-speech voices measure 6–11 dB for eight
   * of nine women's voices (typically 10) and −1 to 4 dB for six men's voices
   * (typically 1.5).
   */
  weightMidpointDb: 4.5,
  /** dB per logistic unit: ≈1.5 dB scores about 18, ≈7.5 dB about 82. */
  weightDbPerUnit: 2,
  /** Melodic variation (standard deviation, in semitones) typical of read speech. */
  intonationMidpointSemitones: 2.2,
  /** Semitones per logistic unit: a flat 1.2 scores about 22, a lively 3.2 about 78. */
  intonationSemitonesPerUnit: 0.8,
  /** Each factor's share of the combined estimate. */
  shares: { pitch: 0.35, resonance: 0.35, weight: 0.2, intonation: 0.1 },
  /** No factor counts beyond this many logistic units (a score of about 5 or 95). */
  maxUnits: 3,
  naturalness: {
    /** Pitch may lead resonance or weight by this many logistic units before it sounds out of place… */
    mismatchStartUnits: 2,
    /** …and counts fully from this much (such as 230 Hz with 1000 Hz formant spacing). */
    mismatchFullUnits: 4.5,
    /** Below this melodic variation (semitones), speech starts to sound flat or held… */
    flatStartSemitones: 1.2,
    flatFullSemitones: 0.6,
    /** …and above this, exaggerated. */
    exaggeratedStartSemitones: 5,
    exaggeratedFullSemitones: 7,
    /** Sudden pitch breaks per minute of voiced sound. */
    breaksStartPerMinute: 4,
    breaksFullPerMinute: 15,
    /** The most each concern can take away from naturalness (0 … 1). */
    impact: { resonanceMismatch: 0.7, weightMismatch: 0.4, melody: 0.5, breaks: 0.5 },
    /** Concerns that take at least this much off naturalness (10 points) are reported. */
    noteThreshold: 0.1,
    /** Logistic units taken off the estimate when naturalness is 0. */
    maxPenaltyUnits: 1.5,
  },
  /** Below this much voiced speech there is too little to go on. */
  minVoicedSeconds: 2,
  minResonanceFrames: 20,
  /** LPC formant estimates get less reliable for higher voices. */
  reliablePitchLimitHz: 280,
  /** Above this share of voiced time in long unbroken stretches, it is held notes or sirens, not speech. */
  maxSustainedShare: 0.5,
} as const;

/** Something that made the recording sound less natural, in the order of how much it mattered. */
export type NaturalnessNote =
  | 'pitch-ahead-of-resonance'
  | 'pitch-ahead-of-weight'
  | 'flat-melody'
  | 'exaggerated-melody'
  | 'pitch-breaks';

export interface FemininityEstimate {
  /** 0 (more masculine-leaning) … 100 (more feminine-leaning). */
  score: number;
  /** Plausible range around the score. */
  low: number;
  high: number;
  /** Where each factor alone would place this recording (0 … 100). */
  pitchScore: number;
  resonanceScore: number;
  /** Null when vocal weight could not be measured; the other factors then share its part. */
  weightScore: number | null;
  intonationScore: number;
  /** How natural the recording sounds (0 … 100). It can lower the score, never raise it. */
  naturalnessScore: number;
  /** What lowered naturalness, most important first. */
  naturalnessNotes: NaturalnessNote[];
  /** True when the recording was short or the measurements less reliable. */
  lowConfidence: boolean;
}

export type FemininityResult =
  | { status: 'ok'; estimate: FemininityEstimate }
  | { status: 'not-enough-speech' }
  | { status: 'not-speech' }
  | { status: 'no-resonance' };

export interface FemininityInputs {
  pitch: PitchSummary | null;
  resonance: ResonanceSummary | null;
  /** Null when vocal weight could not be measured, including recordings analysed before it was. */
  weight: VoiceQualitySummary | null;
  prosody: ProsodySummary | null;
}

interface FactorUnits {
  pitch: number;
  resonance: number;
  weight: number | null;
  intonation: number;
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const toScore = (x: number) => Math.round(100 * logistic(x));
const clampUnits = (x: number) => Math.max(-FEMININITY_MODEL.maxUnits, Math.min(FEMININITY_MODEL.maxUnits, x));
/** 0 up to `start`, rising linearly to 1 at `full`; works in either direction. */
const ramp = (value: number, start: number, full: number) =>
  Math.min(1, Math.max(0, (value - start) / (full - start)));

/** Naturalness (0 … 1, where 1 means nothing stood out) and what lowered it. */
function assessNaturalness(units: FactorUnits, pitch: PitchSummary, prosody: ProsodySummary | null) {
  const model = FEMININITY_MODEL.naturalness;
  const mismatch = (gap: number) => ramp(gap, model.mismatchStartUnits, model.mismatchFullUnits);
  const concerns: Array<{ note: NaturalnessNote; strength: number; impact: number }> = [
    {
      note: 'pitch-ahead-of-resonance',
      strength: mismatch(units.pitch - units.resonance),
      impact: model.impact.resonanceMismatch,
    },
    {
      note: 'pitch-ahead-of-weight',
      strength: units.weight === null ? 0 : mismatch(units.pitch - units.weight),
      impact: model.impact.weightMismatch,
    },
    {
      note: 'flat-melody',
      strength: ramp(pitch.variationSemitones, model.flatStartSemitones, model.flatFullSemitones),
      impact: model.impact.melody,
    },
    {
      note: 'exaggerated-melody',
      strength: ramp(pitch.variationSemitones, model.exaggeratedStartSemitones, model.exaggeratedFullSemitones),
      impact: model.impact.melody,
    },
    {
      note: 'pitch-breaks',
      strength: prosody ? ramp(prosody.breaksPerMinute, model.breaksStartPerMinute, model.breaksFullPerMinute) : 0,
      impact: model.impact.breaks,
    },
  ];
  return {
    value: concerns.reduce((product, { strength, impact }) => product * (1 - impact * strength), 1),
    notes: concerns
      .filter(({ strength, impact }) => strength * impact >= model.noteThreshold)
      .sort((a, b) => b.strength * b.impact - a.strength * a.impact)
      .map(({ note }) => note),
  };
}

export function estimateFemininity({ pitch, resonance, weight, prosody }: FemininityInputs): FemininityResult {
  const model = FEMININITY_MODEL;
  if (!pitch || pitch.voicedSeconds < model.minVoicedSeconds) return { status: 'not-enough-speech' };
  if (prosody && prosody.sustainedShare > model.maxSustainedShare) return { status: 'not-speech' };
  if (!resonance || resonance.frames < model.minResonanceFrames) return { status: 'no-resonance' };

  const units: FactorUnits = {
    pitch: clampUnits(semitonesBetween(model.pitchMidpointHz, pitch.medianHz) / model.pitchSemitonesPerUnit),
    resonance: clampUnits((resonance.formantSpacingHz - model.resonanceMidpointHz) / model.resonanceHzPerUnit),
    weight: weight ? clampUnits((weight.h1h2Db - model.weightMidpointDb) / model.weightDbPerUnit) : null,
    intonation: clampUnits(
      (pitch.variationSemitones - model.intonationMidpointSemitones) / model.intonationSemitonesPerUnit,
    ),
  };

  // Weighted average in log-odds. Without a weight measurement, the others share its part.
  const parts: Array<[share: number, units: number]> = [
    [model.shares.pitch, units.pitch],
    [model.shares.resonance, units.resonance],
    [model.shares.intonation, units.intonation],
  ];
  if (units.weight !== null) parts.push([model.shares.weight, units.weight]);
  const totalShare = parts.reduce((sum, [share]) => sum + share, 0);
  const average = parts.reduce((sum, [share, value]) => sum + share * value, 0) / totalShare;

  const naturalness = assessNaturalness(units, pitch, prosody);
  const combined = average - model.naturalness.maxPenaltyUnits * (1 - naturalness.value);

  const lowConfidence =
    pitch.voicedSeconds < 5 || resonance.frames < 60 || pitch.medianHz > model.reliablePitchLimitHz;

  // The margin is in log-odds units, so it narrows near the ends of the scale.
  // It always includes model uncertainty, plus more for short recordings and
  // when vocal weight is missing.
  const margin =
    0.45 +
    0.4 * Math.sqrt(model.minVoicedSeconds / Math.max(pitch.voicedSeconds, model.minVoicedSeconds)) +
    (lowConfidence ? 0.25 : 0) +
    (units.weight === null ? 0.15 : 0);

  return {
    status: 'ok',
    estimate: {
      score: toScore(combined),
      low: toScore(combined - margin),
      high: toScore(combined + margin),
      pitchScore: toScore(units.pitch),
      resonanceScore: toScore(units.resonance),
      weightScore: units.weight === null ? null : toScore(units.weight),
      intonationScore: toScore(units.intonation),
      naturalnessScore: Math.round(100 * naturalness.value),
      naturalnessNotes: naturalness.notes,
      lowConfidence,
    },
  };
}

/** The estimate for a recording's analysis, with prosody read from its pitch track. */
export function estimateFromAnalysis(analysis: RecordingAnalysis): FemininityResult {
  return estimateFemininity({
    pitch: analysis.summary,
    resonance: analysis.resonance,
    weight: analysis.voice,
    prosody: summarizeProsody(analysis.pitch, analysis.hopSeconds),
  });
}
