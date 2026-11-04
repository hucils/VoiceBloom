// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { frameIndexAt, hzTicks, hzToY, yToHz } from './scale';

const range = { low: 60, high: 500 };

describe('pitch chart scale', () => {
  it('maps the range ends to the plot edges', () => {
    expect(hzToY(60, range, 10, 210)).toBeCloseTo(210, 10);
    expect(hzToY(500, range, 10, 210)).toBeCloseTo(10, 10);
  });

  it('is logarithmic: the geometric mean sits in the middle', () => {
    expect(hzToY(Math.sqrt(60 * 500), range, 0, 200)).toBeCloseTo(100, 10);
  });

  it('inverts cleanly', () => {
    expect(yToHz(hzToY(182, range, 0, 160), range, 0, 160)).toBeCloseTo(182, 8);
  });

  it('chooses round ticks that do not crowd', () => {
    const ticks = hzTicks(range, 160);
    expect(ticks[0]).toBe(60);
    expect(ticks.every((hz) => hz >= 60 && hz <= 500)).toBe(true);
    for (let i = 1; i < ticks.length; i++) {
      expect(hzToY(ticks[i - 1]!, range, 0, 160) - hzToY(ticks[i]!, range, 0, 160)).toBeGreaterThanOrEqual(22);
    }
    expect(hzTicks(range, 400).length).toBeGreaterThan(ticks.length);
  });

  it('finds the nearest frame for a time, clamped to the track', () => {
    expect(frameIndexAt(0.5, 0.0167, 0.02, 100)).toBe(24);
    expect(frameIndexAt(-1, 0.0167, 0.02, 100)).toBe(0);
    expect(frameIndexAt(99, 0.0167, 0.02, 100)).toBe(99);
  });
});
