/** Canvas drawing for the pitch charts, shared by the live and recorded views. */
import type { HzRange } from '../../persistence';
import { CHART_FONT, type ChartColors } from './canvas';
import { hzTicks, hzToY } from './scale';

export const PLOT = { left: 40, right: 12, top: 12, bottom: 12 } as const;

export interface PitchPoint {
  x: number;
  hz: number | null;
}

export interface PitchChartScene {
  width: number;
  height: number;
  range: HzRange;
  band: HzRange | null;
  colors: ChartColors;
  points: readonly PitchPoint[];
  /** Points further apart than this are not joined (a pause). */
  maxGapPx: number;
  cursorX?: number | null;
  hoverX?: number | null;
  endDot?: { x: number; hz: number } | null;
}

export function drawPitchChart(context: CanvasRenderingContext2D, scene: PitchChartScene): void {
  const { width, height, range, band, colors } = scene;
  const left = PLOT.left;
  const right = width - PLOT.right;
  const top = PLOT.top;
  const bottom = height - PLOT.bottom;
  const y = (hz: number) => hzToY(hz, range, top, bottom);

  // Practice band: a soft wash with hairline edges, under everything else.
  if (band) {
    const high = y(Math.min(band.high, range.high));
    const low = y(Math.max(band.low, range.low));
    if (low > high) {
      context.fillStyle = colors.band;
      context.fillRect(left, high, right - left, low - high);
      context.strokeStyle = colors.bandEdge;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(left, Math.round(high) + 0.5);
      context.lineTo(right, Math.round(high) + 0.5);
      context.moveTo(left, Math.round(low) + 0.5);
      context.lineTo(right, Math.round(low) + 0.5);
      context.stroke();
    }
  }

  // Recessive grid: solid hairlines one step off the surface, labels in muted ink.
  context.font = CHART_FONT;
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.lineWidth = 1;
  for (const hz of hzTicks(range, bottom - top)) {
    const lineY = Math.round(y(hz)) + 0.5;
    context.strokeStyle = colors.grid;
    context.beginPath();
    context.moveTo(left, lineY);
    context.lineTo(right, lineY);
    context.stroke();
    context.fillStyle = colors.label;
    context.fillText(String(hz), left - 8, lineY);
  }

  // The trace: 2px, round joins and caps, clipped to the plot.
  context.save();
  context.beginPath();
  context.rect(left, top - 2, right - left, bottom - top + 4);
  context.clip();
  context.strokeStyle = colors.trace;
  context.lineWidth = 2;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  let previousX: number | null = null;
  for (const point of scene.points) {
    if (point.hz === null) {
      previousX = null;
      continue;
    }
    const pointY = y(point.hz);
    if (previousX === null || point.x - previousX > scene.maxGapPx) context.moveTo(point.x, pointY);
    else context.lineTo(point.x, pointY);
    previousX = point.x;
  }
  context.stroke();
  context.restore();

  if (scene.hoverX != null) {
    context.strokeStyle = colors.label;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(Math.round(scene.hoverX) + 0.5, top);
    context.lineTo(Math.round(scene.hoverX) + 0.5, bottom);
    context.stroke();
  }

  if (scene.cursorX != null) {
    context.strokeStyle = colors.cursor;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(scene.cursorX, top);
    context.lineTo(scene.cursorX, bottom);
    context.stroke();
  }

  // Live end marker: r = 4 with a 2px surface ring so it stays legible over the line.
  if (scene.endDot && scene.endDot.hz >= range.low && scene.endDot.hz <= range.high) {
    context.beginPath();
    context.arc(scene.endDot.x, y(scene.endDot.hz), 4, 0, Math.PI * 2);
    context.fillStyle = colors.trace;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = colors.surface;
    context.stroke();
  }
}
