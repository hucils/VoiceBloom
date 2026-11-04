// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { concat, harmonicTone, shapedVowel, silence, sine, vowel } from '../test/signals';
import { analyzeSamples } from './analysis';
import { formantGainDb, harmonicLevelDb, spectralPower } from './voiceQuality';

const SR = 16_000;

/** Source spectrum with a chosen H1–H2 and a natural −12 dB/octave roll-off above H2. */
const source = (h1h2Db: number) => (harmonic: number) =>
  harmonic === 1 ? 0 : -h1h2Db - 12 * Math.log2(harmonic / 2);

const weightOf = (samples: Float32Array) => analyzeSamples(samples, SR).voice;

const hann = (samples: Float32Array) =>
  Float64Array.from(samples, (value, i) => value * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (samples.length - 1))));

describe('harmonic levels', () => {
  it('measures the power of a sinusoid at any frequency', () => {
    const tone = sine(123.4, SR, 0.1, 0.5);
    // A sinusoid of amplitude A over N samples has |X(f)| ≈ A·N/2 at its own frequency.
    const expected = (0.5 * tone.length) / 2;
    expect(Math.sqrt(spectralPower(tone, SR, 123.4)) / expected).toBeCloseTo(1, 1);
    expect(spectralPower(tone, SR, 300)).toBeLessThan(spectralPower(tone, SR, 123.4) * 1e-3);
  });

  it('finds a harmonic a little away from where it was expected', () => {
    const window = hann(harmonicTone(103, SR, 0.1, [1, 0.5]));
    const exact = harmonicLevelDb(window, SR, 103)!;
    expect(harmonicLevelDb(window, SR, 100)).toBeCloseTo(exact, 0);
    // The second harmonic is 6 dB below the first.
    expect(exact - harmonicLevelDb(window, SR, 206)!).toBeCloseTo(6, 0);
  });

  it('gives up when nothing is near the expected frequency', () => {
    expect(harmonicLevelDb(hann(sine(130, SR, 0.1)), SR, 100)).toBeNull();
  });

  it('models how much a formant boosts a nearby harmonic', () => {
    expect(formantGainDb(0, 500, 8000)).toBeCloseTo(0, 10);
    expect(formantGainDb(500, 500, 8000)).toBeGreaterThan(formantGainDb(250, 500, 8000));
    expect(formantGainDb(250, 500, 8000)).toBeGreaterThan(formantGainDb(100, 500, 8000));
    expect(formantGainDb(2000, 500, 8000)).toBeLessThan(0);
    // A narrower formant rings more sharply at its own frequency.
    expect(formantGainDb(500, 500, 8000, 50)).toBeGreaterThan(formantGainDb(500, 500, 8000, 150));
  });
});

describe('vocal weight (H1*–H2*)', () => {
  it('reads an equal-harmonic source as about 0 dB, whatever the pitch and vowel', () => {
    // An impulse train has equally strong harmonics, so its H1–H2 is 0 dB once
    // the formants' boost is removed. Uncorrected, these read from −2 to −10 dB.
    for (const [f0, formants, tolerance] of [
      [110, [500, 1500, 2500, 3500], 1],
      [180, [700, 1200, 2600, 3500], 1], // "ah"
      [220, [600, 1750, 2900, 3900], 2], // sparse harmonics make F1 less exact
      [120, [320, 800, 2300, 3300], 3], // "oo": LPC places a low F1 a little high
      [140, [300, 2300, 3000, 3800], 3], // "ee"
    ] as const) {
      const voice = weightOf(vowel(f0, formants, SR, 1.5));
      expect(voice, `${f0} Hz`).not.toBeNull();
      expect(Math.abs(voice!.h1h2Db), `${f0} Hz, F1 ${formants[0]} Hz`).toBeLessThan(tolerance);
    }
  });

  it('declines rather than guessing when a harmonic sits right on the first formant', () => {
    // 2 × 250 Hz lands on F1 (520 Hz), which boosts H2 by about 17 dB.
    const voice = weightOf(vowel(250, [520, 1800, 2800, 3700], SR, 1.5));
    if (voice) expect(Math.abs(voice.h1h2Db)).toBeLessThan(2);
  });

  it('recovers the source H1–H2 through different vowels', () => {
    for (const h1h2 of [0, 4, 8]) {
      const low = weightOf(shapedVowel(120, [500, 1500, 2500, 3500], SR, 1.5, source(h1h2)))!;
      const high = weightOf(shapedVowel(210, [620, 1800, 2850, 3800], SR, 1.5, source(h1h2)))!;
      expect(Math.abs(low.h1h2Db - h1h2), `${h1h2} dB at 120 Hz`).toBeLessThan(1.5);
      expect(Math.abs(high.h1h2Db - h1h2), `${h1h2} dB at 210 Hz`).toBeLessThan(1.5);
    }
  });

  it('reads a lighter voice as higher than a fuller one at the same pitch', () => {
    const fuller = weightOf(shapedVowel(180, [550, 1650, 2700, 3700], SR, 1.5, source(1)))!;
    const lighter = weightOf(shapedVowel(180, [550, 1650, 2700, 3700], SR, 1.5, source(7)))!;
    expect(lighter.h1h2Db - fuller.h1h2Db).toBeGreaterThan(4.5);
    expect(lighter.h1h2Db - fuller.h1h2Db).toBeLessThan(7.5);
  });

  it('is not measured without enough voiced sound', () => {
    expect(weightOf(silence(SR, 1))).toBeNull();
    expect(weightOf(concat(silence(SR, 0.5), vowel(150, [500, 1500, 2500, 3500], SR, 0.15), silence(SR, 0.5)))).toBeNull();
  });
});
