// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { amplitudeToDb, dbToMeterValue, rms, SILENCE_DB } from './level';
import { mean, median, quantile, standardDeviation } from './stats';
import { computePeaks, normalizePeaks } from './waveform';
import { sine } from '../test/signals';

describe('statistics', () => {
  it('computes mean and median', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('interpolates quantiles between ranks', () => {
    const values = [10, 20, 30, 40, 50];
    expect(quantile(values, 0)).toBe(10);
    expect(quantile(values, 1)).toBe(50);
    expect(quantile(values, 0.1)).toBeCloseTo(14, 10);
    expect(quantile(values, 0.9)).toBeCloseTo(46, 10);
  });

  it('does not mutate its input', () => {
    const values = [3, 1, 2];
    quantile(values, 0.5);
    expect(values).toEqual([3, 1, 2]);
  });

  it('computes the population standard deviation', () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('returns NaN for empty input', () => {
    expect(mean([])).toBeNaN();
    expect(median([])).toBeNaN();
    expect(standardDeviation([])).toBeNaN();
  });
});

describe('levels', () => {
  it('computes RMS of a sine as amplitude / √2', () => {
    expect(rms(sine(100, 8000, 1, 0.8))).toBeCloseTo(0.8 / Math.SQRT2, 3);
  });

  it('converts amplitude to dBFS with a silence floor', () => {
    expect(amplitudeToDb(1)).toBeCloseTo(0, 10);
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.02, 2);
    expect(amplitudeToDb(0)).toBe(SILENCE_DB);
    expect(amplitudeToDb(1e-9)).toBe(SILENCE_DB);
  });

  it('maps dBFS onto a 0–1 meter scale', () => {
    expect(dbToMeterValue(-80)).toBe(0);
    expect(dbToMeterValue(-30)).toBeCloseTo(0.5, 10);
    expect(dbToMeterValue(3)).toBe(1);
  });
});

describe('waveform peaks', () => {
  it('returns one peak per bucket', () => {
    const samples = new Float32Array([0, 0.5, -0.9, 0.1, 0.2, -0.3]);
    expect(computePeaks(samples, 3)).toEqual([0.5, expect.closeTo(0.9, 5), expect.closeTo(0.3, 5)]);
  });

  it('handles inputs shorter than the bucket count', () => {
    const peaks = computePeaks(new Float32Array([0.4]), 4);
    expect(peaks).toHaveLength(4);
    expect(Math.max(...peaks)).toBeCloseTo(0.4, 5);
  });

  it('handles empty input', () => {
    expect(computePeaks(new Float32Array(0), 3)).toEqual([0, 0, 0]);
  });

  it('normalises so the loudest peak is 1', () => {
    expect(normalizePeaks([0.1, 0.2, 0.4])).toEqual([0.25, 0.5, 1]);
    expect(normalizePeaks([0, 0])).toEqual([0, 0]);
  });
});
