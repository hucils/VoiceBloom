import { useEffect, useRef, useState } from 'react';

import type { RecordingAnalysis } from '../../audio/analysis';
import type { LivePitchTracker } from '../../audio/live';
import { hzToNote } from '../../audio/pitchMath';
import { useI18n } from '../../i18n/I18nContext';
import type { HzRange } from '../../persistence';
import { prepareCanvas, useChartColors, useElementWidth } from './canvas';
import { drawPitchChart, PLOT, type PitchPoint } from './pitchChart';
import { frameIndexAt } from './scale';

interface LivePitchTraceProps {
  tracker: LivePitchTracker;
  range: HzRange;
  band: HzRange | null;
  height?: number;
  windowSeconds?: number;
}

/** Scrolling trace of the last few seconds of pitch, drawn on every audio frame. */
export function LivePitchTrace({ tracker, range, band, height = 200, windowSeconds = 8 }: LivePitchTraceProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const colors = useChartColors();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const plotWidth = width - PLOT.left - PLOT.right;
    const pxPerSecond = plotWidth / windowSeconds;
    const right = width - PLOT.right;

    const draw = () => {
      const context = prepareCanvas(canvas, width, height);
      if (!context) return;
      const now = tracker.time;
      const frames = tracker.history.all;
      const points: PitchPoint[] = [];
      for (const frame of frames) {
        if (now - frame.time > windowSeconds) continue;
        points.push({ x: right - (now - frame.time) * pxPerSecond, hz: frame.frequency });
      }
      const latest = tracker.history.latest;
      drawPitchChart(context, {
        width,
        height,
        range,
        band,
        colors,
        points,
        maxGapPx: pxPerSecond * 0.12,
        endDot: latest?.frequency != null && now - latest.time < 0.2 ? { x: right, hz: latest.frequency } : null,
      });
    };
    draw();
    return tracker.subscribe(draw);
  }, [tracker, width, height, range, band, colors, windowSeconds]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} role="img" aria-label={t('voice.chartLabel')} style={{ width: '100%', height }} className="block" />
    </div>
  );
}

interface PitchContourProps {
  analysis: Pick<RecordingAnalysis, 'pitch' | 'firstFrameSec' | 'hopSeconds' | 'durationSec' | 'summary'>;
  range: HzRange;
  band: HzRange | null;
  cursorTime?: number | null;
  showNoteNames?: boolean;
  onSeek?: (seconds: number) => void;
  height?: number;
}

/** A recording's pitch over time, with the playback position and a hover readout. */
export function PitchContour({
  analysis,
  range,
  band,
  cursorTime,
  showNoteNames = true,
  onSeek,
  height = 160,
}: PitchContourProps) {
  const { t, format } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const colors = useChartColors();
  const [hoverX, setHoverX] = useState<number | null>(null);

  const plotWidth = Math.max(1, width - PLOT.left - PLOT.right);
  const duration = Math.max(analysis.durationSec, 0.001);
  const xToTime = (x: number) => Math.min(duration, Math.max(0, ((x - PLOT.left) / plotWidth) * duration));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const context = prepareCanvas(canvas, width, height);
    if (!context) return;
    const points = analysis.pitch.map((hz, index) => ({
      x: PLOT.left + ((analysis.firstFrameSec + index * analysis.hopSeconds) / duration) * plotWidth,
      hz,
    }));
    drawPitchChart(context, {
      width,
      height,
      range,
      band,
      colors,
      points,
      maxGapPx: (plotWidth / duration) * analysis.hopSeconds * 2.5,
      cursorX: cursorTime != null ? PLOT.left + (cursorTime / duration) * plotWidth : null,
      hoverX,
    });
  }, [analysis, width, height, range, band, colors, cursorTime, hoverX, duration, plotWidth]);

  const summary = analysis.summary;
  const label = summary
    ? t('player.pitchChartSummary', {
        median: format.hz(summary.medianHz),
        low: format.hz(summary.lowHz),
        high: format.hz(summary.highHz),
      })
    : t('player.pitchChartEmpty');

  let hover: { time: number; hz: number | null } | null = null;
  if (hoverX !== null && analysis.pitch.length > 0) {
    const time = xToTime(hoverX);
    const index = frameIndexAt(time, analysis.firstFrameSec, analysis.hopSeconds, analysis.pitch.length);
    hover = { time, hz: analysis.pitch[index] ?? null };
  }
  const hoverNote = hover?.hz ? hzToNote(hover.hz) : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${onSeek ? 'cursor-pointer' : ''}`}
      onPointerMove={(event) => {
        const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
        setHoverX(x >= PLOT.left && x <= width - PLOT.right ? x : null);
      }}
      onPointerLeave={() => setHoverX(null)}
      onClick={(event) => {
        if (!onSeek) return;
        const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
        onSeek(xToTime(x));
      }}
    >
      <canvas ref={canvasRef} role="img" aria-label={label} style={{ width: '100%', height }} className="block" />
      {hover && hoverX !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-soft"
          style={{ left: Math.min(Math.max(hoverX, 70), width - 70) }}
        >
          <span className="font-semibold text-ink tabular-nums">{hover.hz ? format.hz(hover.hz) : '—'}</span>
          {showNoteNames && hoverNote && (
            <span className="ml-1.5 text-ink-muted">{format.note(hoverNote.pitchClass, hoverNote.octave)}</span>
          )}
          <span className="ml-1.5 text-ink-subtle tabular-nums">{format.duration(hover.time * 1000)}</span>
        </div>
      )}
    </div>
  );
}
