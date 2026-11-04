// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { PitchSummary } from '../audio/pitchTrack';
import type { ResonanceSummary } from '../audio/resonance';
import { estimateFemininity, type FemininityEstimate } from './femininity';

const pitch = (medianHz: number, voicedSeconds = 10): PitchSummary => ({
  medianHz,
  lowHz: medianHz * 0.9,
  highHz: medianHz * 1.1,
  rangeSemitones: 3.3,
  variationSemitones: 1.2,
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

function estimate(hz: number, spacing: number, voicedSeconds?: number, frames?: number): FemininityEstimate {
  const result = estimateFemininity(pitch(hz, voicedSeconds), resonance(spacing, frames));
  if (result.status !== 'ok') throw new Error(`expected an estimate, got ${result.status}`);
  return result.estimate;
}

describe('femininity estimate', () => {
  it('places typical adult averages towards the two ends of the scale', () => {
    expect(estimate(120, 1000).score).toBeLessThan(20);
    expect(estimate(210, 1170).score).toBeGreaterThan(80);
    expect(estimate(160, 1085).score).toBe(50);
  });

  it('rises with pitch and with brighter resonance', () => {
    expect(estimate(190, 1085).score).toBeGreaterThan(estimate(150, 1085).score);
    expect(estimate(160, 1150).score).toBeGreaterThan(estimate(160, 1050).score);
  });

  it('does not let pitch alone carry the result', () => {
    // A high pitch with dark resonance lands in the middle, not near 100.
    const mixed = estimate(220, 980);
    expect(mixed.score).toBeGreaterThan(30);
    expect(mixed.score).toBeLessThan(70);
    expect(mixed.pitchScore).toBeGreaterThan(90);
    expect(mixed.resonanceScore).toBeLessThan(15);
  });

  it('reports a range that contains the score and stays within 0–100', () => {
    for (const [hz, spacing] of [
      [90, 900],
      [160, 1085],
      [300, 1300],
    ] as const) {
      const result = estimate(hz, spacing);
      expect(result.low).toBeLessThanOrEqual(result.score);
      expect(result.high).toBeGreaterThanOrEqual(result.score);
      expect(result.low).toBeGreaterThanOrEqual(0);
      expect(result.high).toBeLessThanOrEqual(100);
    }
  });

  it('is less certain about short recordings', () => {
    const short = estimate(170, 1100, 2.5, 40);
    const long = estimate(170, 1100, 30, 300);
    expect(short.high - short.low).toBeGreaterThan(long.high - long.low);
    expect(short.lowConfidence).toBe(true);
    expect(long.lowConfidence).toBe(false);
  });

  it('flags higher voices, where formant tracking is less reliable', () => {
    expect(estimate(300, 1200).lowConfidence).toBe(true);
  });

  it('declines to estimate without enough speech or resonance data', () => {
    expect(estimateFemininity(null, resonance(1100))).toEqual({ status: 'not-enough-speech' });
    expect(estimateFemininity(pitch(180, 1), resonance(1100))).toEqual({ status: 'not-enough-speech' });
    expect(estimateFemininity(pitch(180), null)).toEqual({ status: 'no-resonance' });
    expect(estimateFemininity(pitch(180), resonance(1100, 5))).toEqual({ status: 'no-resonance' });
  });
});
