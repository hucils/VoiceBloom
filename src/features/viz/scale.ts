/** Pure layout math for the pitch charts (no DOM). */
import type { HzRange } from '../../persistence';

/**
 * Vertical position of a frequency on a logarithmic (musical) scale, so equal
 * musical intervals take equal space. `top` maps to range.high.
 */
export function hzToY(hz: number, range: HzRange, top: number, bottom: number): number {
  const low = Math.log2(range.low);
  const high = Math.log2(range.high);
  const fraction = (Math.log2(hz) - low) / (high - low);
  return bottom - fraction * (bottom - top);
}

export function yToHz(y: number, range: HzRange, top: number, bottom: number): number {
  const low = Math.log2(range.low);
  const high = Math.log2(range.high);
  return 2 ** (low + ((bottom - y) / (bottom - top)) * (high - low));
}

/** Round values in order of preference: octaves of 100 Hz first, then the halfway points. */
const PREFERRED_TICKS = [100, 200, 400, 800, 50, 150, 300, 600, 1200, 60, 80, 120, 250, 500, 1000, 40, 70, 180];

/** Round Hz values to label, at least `minGapPx` apart, ascending. */
export function hzTicks(range: HzRange, plotHeight: number, minGapPx = 22): number[] {
  const chosen: Array<{ hz: number; y: number }> = [];
  for (const hz of PREFERRED_TICKS) {
    if (hz < range.low || hz > range.high) continue;
    const y = hzToY(hz, range, 0, plotHeight);
    if (chosen.every((tick) => Math.abs(tick.y - y) >= minGapPx)) chosen.push({ hz, y });
  }
  return chosen.map((tick) => tick.hz).sort((a, b) => a - b);
}

/** The nearest analysis frame to a time, given frame spacing. */
export function frameIndexAt(timeSec: number, firstFrameSec: number, hopSeconds: number, frameCount: number): number {
  const index = Math.round((timeSec - firstFrameSec) / hopSeconds);
  return Math.min(frameCount - 1, Math.max(0, index));
}
