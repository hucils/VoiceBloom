// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { analyzeSamples } from '../audio/analysis';
import type { PitchSummary } from '../audio/pitchTrack';
import type { ResonanceSummary } from '../audio/resonance';
import { concat, glide, silence, vowel } from '../test/signals';
import {
  estimateFemininity,
  estimateFromAnalysis,
  type FemininityEstimate,
  type FemininityInputs,
} from './femininity';

interface Voice {
  hz: number;
  /** Formant spacing, Hz. */
  spacing: number;
  /** H1*–H2*, dB; null when vocal weight was not measured. Defaults to the midpoint. */
  h1h2?: number | null;
  /** Melodic variation, semitones. Defaults to the midpoint. */
  variation?: number;
  voicedSeconds?: number;
  frames?: number;
  breaksPerMinute?: number;
}

const pitch = (medianHz: number, variationSemitones = 2.2, voicedSeconds = 10): PitchSummary => ({
  medianHz,
  lowHz: medianHz * 0.85,
  highHz: medianHz * 1.15,
  rangeSemitones: 5.4,
  variationSemitones,
  voicedSeconds,
  voicedRatio: 0.7,
});

const resonance = (formantSpacingHz: number, frames = 200): ResonanceSummary => ({
  formantSpacingHz,
  f1Hz: formantSpacingHz * 0.5,
  f2Hz: formantSpacingHz * 1.5,
  f3Hz: formantSpacingHz * 2.5,
  frames,
});

const inputs = (voice: Voice): FemininityInputs => ({
  pitch: pitch(voice.hz, voice.variation, voice.voicedSeconds),
  resonance: resonance(voice.spacing, voice.frames),
  weight: voice.h1h2 === null ? null : { h1h2Db: voice.h1h2 ?? 4.5, frames: 150 },
  prosody: { breaksPerMinute: voice.breaksPerMinute ?? 0, sustainedShare: 0 },
});

function estimate(voice: Voice): FemininityEstimate {
  const result = estimateFemininity(inputs(voice));
  if (result.status !== 'ok') throw new Error(`expected an estimate, got ${result.status}`);
  return result.estimate;
}

/** Published adult averages for pitch, formant spacing and H1*–H2* (see FEMININITY_MODEL). */
const typicalMan: Voice = { hz: 120, spacing: 1000, h1h2: 1.5 };
const typicalWoman: Voice = { hz: 210, spacing: 1170, h1h2: 7.5 };
const middle: Voice = { hz: 160, spacing: 1085 };

describe('femininity estimate', () => {
  it('places typical adult averages towards the two ends of the scale', () => {
    expect(estimate(typicalMan).score).toBeLessThan(20);
    expect(estimate(typicalWoman).score).toBeGreaterThan(80);
    expect(estimate(middle).score).toBe(50);
  });

  it('rises with each factor on its own', () => {
    expect(estimate({ ...middle, hz: 190 }).score).toBeGreaterThan(estimate({ ...middle, hz: 150 }).score);
    expect(estimate({ ...middle, spacing: 1150 }).score).toBeGreaterThan(estimate({ ...middle, spacing: 1050 }).score);
    expect(estimate({ ...middle, h1h2: 7 }).score).toBeGreaterThan(estimate({ ...middle, h1h2: 2 }).score);
    expect(estimate({ ...middle, variation: 3.2 }).score).toBeGreaterThan(estimate({ ...middle, variation: 1.6 }).score);
  });

  it('weighs pitch and resonance most, then vocal weight, then intonation', () => {
    const lift = (change: Partial<Voice>) => estimate({ ...middle, ...change }).score - 50;
    // Each change moves its own factor to the same score (82).
    const pitchLift = lift({ hz: 194 });
    const resonanceLift = lift({ spacing: 1160 });
    const weightLift = lift({ h1h2: 7.5 });
    const intonationLift = lift({ variation: 3.4 });
    expect(Math.abs(pitchLift - resonanceLift)).toBeLessThanOrEqual(1);
    expect(resonanceLift).toBeGreaterThan(weightLift);
    expect(weightLift).toBeGreaterThan(intonationLift);
    expect(intonationLift).toBeGreaterThan(0);
  });

  it('does not let pitch alone carry the result', () => {
    // A high pitch with dark resonance and a full, heavy tone leans masculine, not feminine.
    const pitchOnly = estimate({ hz: 220, spacing: 980, h1h2: 1.5 });
    expect(pitchOnly.pitchScore).toBeGreaterThan(90);
    expect(pitchOnly.resonanceScore).toBeLessThan(15);
    expect(pitchOnly.score).toBeLessThan(40);
    expect(pitchOnly.score).toBeGreaterThan(10);
    // Even an extreme pitch cannot.
    expect(estimate({ hz: 400, spacing: 980, h1h2: 1.5 }).score).toBeLessThan(40);
  });

  it('hears pitch far ahead of resonance as less natural', () => {
    const matched = estimate({ hz: 230, spacing: 1150, h1h2: 7 });
    const mismatched = estimate({ hz: 230, spacing: 1000, h1h2: 7 });
    expect(matched.naturalnessScore).toBe(100);
    expect(matched.naturalnessNotes).toEqual([]);
    expect(mismatched.naturalnessScore).toBeLessThan(40);
    expect(mismatched.naturalnessNotes[0]).toBe('pitch-ahead-of-resonance');
  });

  it('hears a high pitch with a heavy tone as less natural', () => {
    const result = estimate({ hz: 230, spacing: 1150, h1h2: -1 });
    expect(result.naturalnessNotes).toEqual(['pitch-ahead-of-weight']);
    expect(result.naturalnessScore).toBeLessThan(90);
  });

  it('hears a flat or exaggerated melody and sudden breaks as less natural, and lowers the estimate', () => {
    const natural = estimate(typicalWoman);
    const flat = estimate({ ...typicalWoman, variation: 0.7 });
    const exaggerated = estimate({ ...typicalWoman, variation: 6.5 });
    const breaking = estimate({ ...typicalWoman, breaksPerMinute: 12 });

    expect(flat.naturalnessNotes).toEqual(['flat-melody']);
    expect(exaggerated.naturalnessNotes).toEqual(['exaggerated-melody']);
    expect(breaking.naturalnessNotes).toEqual(['pitch-breaks']);
    for (const result of [flat, exaggerated, breaking]) {
      expect(result.naturalnessScore).toBeLessThan(natural.naturalnessScore);
      expect(result.score).toBeLessThan(natural.score);
    }
    // A livelier melody counts as more feminine only up to the point where it sounds performed.
    expect(estimate({ ...typicalWoman, variation: 3.4 }).score).toBeGreaterThan(exaggerated.score);
  });

  it('never raises the estimate for sounding natural', () => {
    for (const voice of [typicalMan, typicalWoman, middle]) {
      const result = estimate(voice);
      expect(result.naturalnessScore).toBe(100);
      expect(result.naturalnessNotes).toEqual([]);
    }
    expect(estimate(middle).score).toBe(50);
  });

  it('lists what lowered naturalness, the biggest effect first', () => {
    const result = estimate({ hz: 240, spacing: 990, h1h2: 7, variation: 0.8, breaksPerMinute: 8 });
    expect(result.naturalnessNotes[0]).toBe('pitch-ahead-of-resonance');
    expect(result.naturalnessNotes).toEqual(expect.arrayContaining(['flat-melody', 'pitch-breaks']));
  });

  it('explains any noticeable drop in naturalness', () => {
    // A moderate lead of pitch over resonance: small, but worth saying.
    const result = estimate({ ...middle, hz: 222 });
    expect(result.naturalnessScore).toBeLessThan(90);
    expect(result.naturalnessNotes).toEqual(['pitch-ahead-of-resonance']);
  });

  it('still estimates without a vocal weight measurement, a little less surely', () => {
    const without = estimate({ ...typicalWoman, h1h2: null });
    expect(without.weightScore).toBeNull();
    expect(without.score).toBeGreaterThan(80);
    expect(estimate({ ...typicalMan, h1h2: null }).score).toBeLessThan(20);

    const midWith = estimate(middle);
    const midWithout = estimate({ ...middle, h1h2: null });
    expect(midWithout.score).toBe(50);
    expect(midWithout.high - midWithout.low).toBeGreaterThan(midWith.high - midWith.low);
  });

  it('reports a range that contains the score and stays within 0–100', () => {
    for (const voice of [
      { hz: 90, spacing: 900, h1h2: -6, variation: 0.5, breaksPerMinute: 30 },
      middle,
      { hz: 300, spacing: 1300, h1h2: 14, variation: 4 },
      { hz: 400, spacing: 900, h1h2: null, variation: 9 },
    ]) {
      const result = estimate(voice);
      expect(result.low).toBeLessThanOrEqual(result.score);
      expect(result.high).toBeGreaterThanOrEqual(result.score);
      expect(result.low).toBeGreaterThanOrEqual(0);
      expect(result.high).toBeLessThanOrEqual(100);
      for (const part of [result.pitchScore, result.resonanceScore, result.weightScore ?? 50, result.intonationScore]) {
        expect(part).toBeGreaterThanOrEqual(0);
        expect(part).toBeLessThanOrEqual(100);
      }
      expect(result.naturalnessScore).toBeGreaterThanOrEqual(0);
      expect(result.naturalnessScore).toBeLessThanOrEqual(100);
    }
  });

  it('is less certain about short recordings', () => {
    const short = estimate({ hz: 170, spacing: 1100, voicedSeconds: 2.5, frames: 40 });
    const long = estimate({ hz: 170, spacing: 1100, voicedSeconds: 30, frames: 300 });
    expect(short.high - short.low).toBeGreaterThan(long.high - long.low);
    expect(short.lowConfidence).toBe(true);
    expect(long.lowConfidence).toBe(false);
  });

  it('flags higher voices, where formant tracking is less reliable', () => {
    expect(estimate({ hz: 300, spacing: 1200 }).lowConfidence).toBe(true);
  });

  it('declines to estimate without enough speech or resonance data', () => {
    const base = inputs(middle);
    expect(estimateFemininity({ ...base, pitch: null })).toEqual({ status: 'not-enough-speech' });
    expect(estimateFemininity({ ...base, pitch: pitch(180, 2, 1) })).toEqual({ status: 'not-enough-speech' });
    expect(estimateFemininity({ ...base, resonance: null })).toEqual({ status: 'no-resonance' });
    expect(estimateFemininity({ ...base, resonance: resonance(1100, 5) })).toEqual({ status: 'no-resonance' });
  });

  it('declines for held notes and sirens, which are not speech', () => {
    const base = inputs(middle);
    expect(estimateFemininity({ ...base, prosody: { breaksPerMinute: 0, sustainedShare: 0.9 } })).toEqual({
      status: 'not-speech',
    });
  });
});

describe('femininity estimate from a recording analysis', () => {
  const SR = 16_000;

  it('reads delivery from the pitch track and weight from the analysis', () => {
    // Twelve short "syllable groups" at varying pitch, separated by pauses.
    const groups = Array.from({ length: 12 }, (_, i) => [
      vowel(190 + 25 * Math.sin(i), [600, 1750, 2900, 3900], SR, 0.35),
      silence(SR, 0.12),
    ]).flat();
    const result = estimateFromAnalysis(analyzeSamples(concat(...groups), SR));
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.estimate.weightScore).not.toBeNull();
    expect(result.estimate.naturalnessNotes).not.toContain('pitch-breaks');
  });

  it('recognises a held note or a siren', () => {
    expect(estimateFromAnalysis(analyzeSamples(vowel(200, [600, 1750, 2900, 3900], SR, 4), SR)).status).toBe(
      'not-speech',
    );
    expect(estimateFromAnalysis(analyzeSamples(glide(150, 400, SR, 4), SR)).status).toBe('not-speech');
  });

  it('estimates older recordings, analysed before vocal weight was measured', () => {
    const analysis = analyzeSamples(
      concat(...Array.from({ length: 12 }, () => [vowel(200, [600, 1750, 2900, 3900], SR, 0.35), silence(SR, 0.12)]).flat()),
      SR,
    );
    const result = estimateFromAnalysis({ ...analysis, version: 1, voice: null });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.estimate.weightScore).toBeNull();
  });
});
