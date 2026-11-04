// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { rms } from './level';
import { analyzeSamples } from './analysis';
import { autocorrelation, levinsonDurbin, polynomialRoots } from './lpc';
import { decimateByTwo } from './resample';
import { formantCandidates, formantSpacing, pickFormants } from './resonance';
import { silence, sine, vowel } from '../test/signals';

const within = (actual: number, expected: number, tolerance: number) =>
  Math.abs(actual - expected) / expected <= tolerance;

describe('polynomial roots', () => {
  it('finds real roots', () => {
    // (z − 1)(z − 2)(z − 3) = z³ − 6z² + 11z − 6
    const roots = polynomialRoots([1, -6, 11, -6]).map((root) => root.re).sort((a, b) => a - b);
    expect(roots[0]).toBeCloseTo(1, 8);
    expect(roots[1]).toBeCloseTo(2, 8);
    expect(roots[2]).toBeCloseTo(3, 8);
  });

  it('finds complex conjugate roots', () => {
    const roots = polynomialRoots([1, 0, 1]); // z² + 1
    expect(roots.map((root) => Math.round(root.im)).sort()).toEqual([-1, 1]);
    roots.forEach((root) => expect(root.re).toBeCloseTo(0, 8));
  });
});

describe('Levinson–Durbin', () => {
  it('recovers a first-order predictor', () => {
    // Autocorrelation of an AR(1) process x[n] = 0.5·x[n−1] + e[n].
    const a = levinsonDurbin([1, 0.5, 0.25], 2)!;
    expect(a[1]).toBeCloseTo(-0.5, 10);
    expect(a[2]).toBeCloseTo(0, 10);
  });

  it('rejects silence', () => {
    expect(levinsonDurbin(autocorrelation(new Float32Array(64), 4), 4)).toBeNull();
  });
});

describe('decimation', () => {
  it('keeps content below the new Nyquist frequency', () => {
    const input = sine(1000, 16_000, 0.5, 0.5);
    const output = decimateByTwo(input);
    expect(output.length).toBe(input.length / 2);
    expect(rms(output, 50, output.length - 50) / rms(input)).toBeGreaterThan(0.95);
  });

  it('removes content that would otherwise alias', () => {
    const output = decimateByTwo(sine(6000, 16_000, 0.5, 0.5));
    expect(rms(output, 50, output.length - 50)).toBeLessThan(0.5 / Math.SQRT2 / 30);
  });
});

describe('formant estimation', () => {
  const neutral = [500, 1500, 2500, 3500];

  it('recovers the formants of a synthetic vowel frame', () => {
    const rate = 8000;
    const frame = vowel(120, neutral, rate, 0.2).subarray(400, 600);
    const formants = pickFormants(formantCandidates(frame, rate, 10), 120);
    expect(formants).not.toBeNull();
    const [f1, f2, f3] = formants!;
    expect(within(f1, 500, 0.12)).toBe(true);
    expect(within(f2, 1500, 0.08)).toBe(true);
    expect(within(f3, 2500, 0.06)).toBe(true);
  });

  it('computes the uniform-tube formant spacing', () => {
    expect(formantSpacing(500, 1500, 2500)).toBeCloseTo(1000, 10);
  });

  it('skips a pole that locked onto the fundamental', () => {
    const candidates = [210, 640, 1800, 2900].map((frequency) => ({ frequency, bandwidth: 80 }));
    expect(pickFormants(candidates, 210)).toEqual([640, 1800, 2900]);
  });

  it('rejects implausible patterns', () => {
    const candidates = [300, 350, 400].map((frequency) => ({ frequency, bandwidth: 80 }));
    expect(pickFormants(candidates, null)).toBeNull();
  });
});

describe('resonance in the recording analysis', () => {
  const SR = 16_000;

  it('measures formants and spacing over a recording', () => {
    const resonance = analyzeSamples(vowel(120, [500, 1500, 2500, 3500], SR, 1.5), SR).resonance!;
    expect(resonance).not.toBeNull();
    expect(within(resonance.f1Hz, 500, 0.12)).toBe(true);
    expect(within(resonance.f2Hz, 1500, 0.08)).toBe(true);
    expect(within(resonance.f3Hz, 2500, 0.06)).toBe(true);
    expect(within(resonance.formantSpacingHz, 1000, 0.05)).toBe(true);
    expect(resonance.frames).toBeGreaterThan(30);
  });

  it('shows a brighter vocal tract as a larger spacing, even at a higher pitch', () => {
    const darker = analyzeSamples(vowel(120, [500, 1500, 2500, 3500], SR, 1.5), SR).resonance!;
    const brighter = analyzeSamples(vowel(200, [585, 1755, 2925, 3900], SR, 1.5), SR).resonance!;
    expect(brighter.formantSpacingHz).toBeGreaterThan(darker.formantSpacingHz * 1.1);
    expect(within(brighter.formantSpacingHz, formantSpacing(585, 1755, 2925), 0.08)).toBe(true);
  });

  it('returns null when there is no voiced sound', () => {
    expect(analyzeSamples(silence(SR, 1), SR).resonance).toBeNull();
  });
});
