// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { add, harmonicTone, sine, silence, vowel, whiteNoise } from '../test/signals';
import { createYinDetector, detectPitch, yinFrameSize } from './yin';

const relativeError = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

describe('YIN pitch detection', () => {
  describe.each([16_000, 44_100, 48_000])('at %i Hz sample rate', (sampleRate) => {
    const frameSize = yinFrameSize(sampleRate);

    it.each([65, 98, 130.8, 185, 220, 329.6, 440, 659.3])('finds a %f Hz sine within 0.5%', (frequency) => {
      const frame = sine(frequency, sampleRate, frameSize / sampleRate);
      const estimate = detectPitch(frame, sampleRate);
      expect(estimate).not.toBeNull();
      expect(relativeError(estimate!.frequency, frequency)).toBeLessThan(0.005);
      expect(estimate!.clarity).toBeGreaterThan(0.9);
    });
  });

  it.each([110, 146.8, 196, 246.9])(
    'finds the fundamental of a harmonic-rich %f Hz tone (no octave errors)',
    (frequency) => {
      const sampleRate = 16_000;
      const frame = harmonicTone(frequency, sampleRate, yinFrameSize(sampleRate) / sampleRate);
      const estimate = detectPitch(frame, sampleRate);
      expect(estimate).not.toBeNull();
      expect(relativeError(estimate!.frequency, frequency)).toBeLessThan(0.01);
    },
  );

  it.each([
    [200, [585, 1755, 2925]],
    [220, [440, 1650, 2900]],
    [180, [720, 1250, 2700]],
  ] as const)(
    'is not fooled by a strong formant on a harmonic (%i Hz voice, F1 %o)',
    (frequency, formants) => {
      const sampleRate = 16_000;
      const frame = vowel(frequency, formants, sampleRate, 0.3).subarray(1000, 1000 + yinFrameSize(sampleRate));
      const estimate = detectPitch(frame, sampleRate);
      expect(estimate).not.toBeNull();
      expect(relativeError(estimate!.frequency, frequency)).toBeLessThan(0.02);
    },
  );

  it('still tracks a tone with background noise (about 20 dB SNR)', () => {
    const sampleRate = 16_000;
    const length = yinFrameSize(sampleRate);
    const tone = harmonicTone(180, sampleRate, length / sampleRate, undefined, 0.5);
    const frame = add(tone, whiteNoise(length, 0.05, 7));
    const estimate = detectPitch(frame, sampleRate);
    expect(estimate).not.toBeNull();
    expect(relativeError(estimate!.frequency, 180)).toBeLessThan(0.01);
  });

  it('reports no pitch for silence', () => {
    expect(detectPitch(silence(16_000, 0.1), 16_000)).toBeNull();
  });

  it('reports no pitch for white noise', () => {
    const sampleRate = 16_000;
    const misses = [1, 2, 3, 4, 5].filter(
      (seed) => detectPitch(whiteNoise(yinFrameSize(sampleRate), 0.3, seed), sampleRate) === null,
    );
    expect(misses.length).toBe(5);
  });

  it('ignores frequencies below the configured minimum', () => {
    const sampleRate = 16_000;
    const frame = sine(40, sampleRate, yinFrameSize(sampleRate, 60) / sampleRate);
    expect(detectPitch(frame, sampleRate, { minFrequency: 60 })).toBeNull();
  });

  it('returns null when the frame is too short for the lag range', () => {
    expect(detectPitch(new Float32Array(8), 16_000)).toBeNull();
  });

  it('can be reused across frames without leaking state', () => {
    const sampleRate = 16_000;
    const detect = createYinDetector(sampleRate);
    const duration = yinFrameSize(sampleRate) / sampleRate;
    expect(detect(sine(200, sampleRate, duration))?.frequency).toBeCloseTo(200, 0);
    expect(detect(silence(sampleRate, duration))).toBeNull();
    expect(detect(sine(120, sampleRate, duration))?.frequency).toBeCloseTo(120, 0);
  });

  it('rejects invalid configuration', () => {
    expect(() => createYinDetector(0)).toThrow(RangeError);
    expect(() => createYinDetector(16_000, { minFrequency: 500, maxFrequency: 100 })).toThrow(RangeError);
  });
});
