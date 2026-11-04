// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { concat, glide, harmonicTone, silence, vowel, whiteNoise } from '../test/signals';
import { analyzeSamples, pitchFrameTime } from './analysis';
import { medianSmooth, removeOutliers, removeShortRuns, summarizePitch } from './pitchTrack';

const SR = 16_000;

describe('pitch track post-processing', () => {
  it('removes an isolated octave spike', () => {
    const smoothed = medianSmooth([200, 201, 400, 199, 200], 2);
    expect(smoothed[2]).toBeCloseTo(200, 0);
  });

  it('keeps unvoiced frames unvoiced', () => {
    expect(medianSmooth([null, 200, null, 210, null], 1)).toEqual([null, 200, null, 210, null]);
  });

  it('drops frames that leap away from their neighbourhood', () => {
    expect(removeOutliers([200, 201, 199, 200, 202, 600, 610, null, null])).toEqual([
      200,
      201,
      199,
      200,
      202,
      null,
      null,
      null,
      null,
    ]);
  });

  it('drops voiced runs shorter than the minimum length', () => {
    expect(removeShortRuns([150, null, 150, 151, 152, null, 160], 3)).toEqual([
      null,
      null,
      150,
      151,
      152,
      null,
      null,
    ]);
  });

  it('summarises a track descriptively', () => {
    const summary = summarizePitch([100, 200, null, 400, null], 0.02)!;
    expect(summary.medianHz).toBe(200);
    expect(summary.voicedSeconds).toBeCloseTo(0.06, 10);
    expect(summary.voicedRatio).toBeCloseTo(0.6, 10);
    expect(summary.rangeSemitones).toBeGreaterThan(0);
  });

  it('returns null when nothing was voiced', () => {
    expect(summarizePitch([null, null], 0.02)).toBeNull();
    expect(summarizePitch([], 0.02)).toBeNull();
  });
});

describe('analyzeSamples', () => {
  it('measures a steady tone', () => {
    const result = analyzeSamples(harmonicTone(150, SR, 1.5), SR);
    expect(result.summary).not.toBeNull();
    expect(result.summary!.medianHz).toBeCloseTo(150, 0);
    expect(result.summary!.rangeSemitones).toBeLessThan(0.2);
    expect(result.summary!.voicedRatio).toBeGreaterThan(0.95);
    expect(result.durationSec).toBeCloseTo(1.5, 5);
  });

  it('follows a rising glide', () => {
    const result = analyzeSamples(glide(120, 240, SR, 2), SR);
    const voiced = result.pitch.filter((value): value is number => value !== null);
    expect(voiced.length).toBeGreaterThan(80);

    // The track rises: each quarter is higher than the one before.
    const quarter = Math.floor(voiced.length / 4);
    const averages = [0, 1, 2, 3].map(
      (q) => voiced.slice(q * quarter, (q + 1) * quarter).reduce((a, b) => a + b, 0) / quarter,
    );
    for (let q = 1; q < 4; q++) expect(averages[q]!).toBeGreaterThan(averages[q - 1]!);

    // Geometric midpoint of 120–240 Hz is ≈169.7 Hz; the 10th–90th percentile spans ≈9.6 semitones.
    expect(result.summary!.medianHz).toBeGreaterThan(160);
    expect(result.summary!.medianHz).toBeLessThan(180);
    expect(result.summary!.rangeSemitones).toBeGreaterThan(8);
    expect(result.summary!.rangeSemitones).toBeLessThan(11);
  });

  it('reports no formant spikes where phrases end (resonance ringing into a pause)', () => {
    // A narrow first formant rings on for several frames after each phrase, as in a reverberant room.
    const samples = vowel(
      200,
      [620, 1750, 2900, 3900],
      SR,
      3,
      0.5,
      [
        [0.8, 1.1],
        [1.9, 2.2],
      ],
      [25, 110, 150, 190],
    );
    const voiced = analyzeSamples(samples, SR).pitch.filter((value): value is number => value !== null);
    expect(voiced.length).toBeGreaterThan(80);
    expect(Math.max(...voiced)).toBeLessThan(200 * 1.1);
    expect(Math.min(...voiced)).toBeGreaterThan(200 / 1.1);
  });

  it('keeps both ends of a wide two-octave siren', () => {
    const voiced = analyzeSamples(glide(110, 440, SR, 2), SR).pitch.filter((value): value is number => value !== null);
    expect(Math.min(...voiced)).toBeLessThan(125);
    expect(Math.max(...voiced)).toBeGreaterThan(390);
  });

  it('marks pauses as unvoiced', () => {
    const samples = concat(harmonicTone(200, SR, 0.5), silence(SR, 0.5), harmonicTone(200, SR, 0.5));
    const result = analyzeSamples(samples, SR);
    const middle = Math.round((0.75 - result.firstFrameSec) / result.hopSeconds);
    expect(result.pitch[middle]).toBeNull();
    expect(result.summary!.voicedRatio).toBeGreaterThan(0.5);
    expect(result.summary!.voicedRatio).toBeLessThan(0.75);
  });

  it('detects quiet recordings thanks to the adaptive silence gate', () => {
    const result = analyzeSamples(harmonicTone(170, SR, 1, undefined, 0.01), SR);
    expect(result.summary?.medianHz).toBeCloseTo(170, 0);
  });

  it('finds little or no pitch in noise', () => {
    const result = analyzeSamples(whiteNoise(SR, 0.2, 3), SR);
    expect(result.summary?.voicedRatio ?? 0).toBeLessThan(0.05);
  });

  it('returns an empty analysis for silence', () => {
    const result = analyzeSamples(silence(SR, 1), SR);
    expect(result.summary).toBeNull();
    expect(result.pitch.every((value) => value === null)).toBe(true);
  });

  it('handles input shorter than one analysis frame', () => {
    const result = analyzeSamples(new Float32Array(100), SR);
    expect(result.pitch).toEqual([]);
    expect(result.summary).toBeNull();
  });

  it('produces the requested number of waveform peaks and frame times', () => {
    const result = analyzeSamples(harmonicTone(220, SR, 1), SR, { peakCount: 50 });
    expect(result.peaks).toHaveLength(50);
    expect(Math.max(...result.peaks)).toBeGreaterThan(0.3);
    expect(pitchFrameTime(result, 10)).toBeCloseTo(result.firstFrameSec + 10 * result.hopSeconds, 10);
  });
});
