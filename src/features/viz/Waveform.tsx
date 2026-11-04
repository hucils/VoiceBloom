import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { normalizePeaks } from '../../audio/waveform';
import { useI18n } from '../../i18n/I18nContext';
import { prepareCanvas, useChartColors, useElementWidth } from './canvas';

interface WaveformProps {
  peaks: readonly number[];
  durationSec: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
  height?: number;
}

const BAR = 2;
const GAP = 2;

/**
 * The recording's waveform as a playback scrubber: thin mirrored bars, played
 * part in the stronger step. Works as a keyboard slider (arrows, Home, End).
 */
export function Waveform({ peaks, durationSec, currentTime, onSeek, height = 64 }: WaveformProps) {
  const { t, format } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const colors = useChartColors();
  const [dragging, setDragging] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const normalized = useMemo(() => normalizePeaks(peaks), [peaks]);
  const progress = durationSec > 0 ? Math.min(1, currentTime / durationSec) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const context = prepareCanvas(canvas, width, height);
    if (!context) return;
    const bars = Math.max(1, Math.floor((width + GAP) / (BAR + GAP)));
    const middle = height / 2;
    const progressX = progress * width;
    for (let bar = 0; bar < bars; bar++) {
      const start = Math.floor((bar / bars) * normalized.length);
      const end = Math.max(start + 1, Math.floor(((bar + 1) / bars) * normalized.length));
      let value = 0;
      for (let i = start; i < end; i++) value = Math.max(value, normalized[i] ?? 0);
      const barHeight = Math.max(2, value * (height - 6));
      const x = bar * (BAR + GAP);
      context.fillStyle = x + BAR / 2 <= progressX ? colors.wavePlayed : colors.wave;
      context.beginPath();
      if (typeof context.roundRect === 'function') context.roundRect(x, middle - barHeight / 2, BAR, barHeight, 1);
      else context.rect(x, middle - barHeight / 2, BAR, barHeight);
      context.fill();
    }
    if (progress > 0 && progress < 1) {
      context.fillStyle = colors.cursor;
      context.fillRect(Math.round(progressX) - 1, 0, 2, height);
    }
  }, [normalized, width, height, colors, progress]);

  const seekToPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(fraction * durationSec);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageDown: -10, PageUp: 10 };
    if (event.key in steps) onSeek(Math.min(durationSec, Math.max(0, currentTime + steps[event.key]!)));
    else if (event.key === 'Home') onSeek(0);
    else if (event.key === 'End') onSeek(durationSec);
    else return;
    event.preventDefault();
  };

  const hoverTime = hoverX !== null && width > 0 ? (hoverX / width) * durationSec : null;

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label={t('player.position')}
      aria-valuemin={0}
      aria-valuemax={Math.round(durationSec)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={t('player.positionValue', {
        current: format.duration(currentTime * 1000),
        total: format.duration(durationSec * 1000),
      })}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        seekToPointer(event);
      }}
      onPointerMove={(event) => {
        setHoverX(event.clientX - event.currentTarget.getBoundingClientRect().left);
        if (dragging) seekToPointer(event);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setHoverX(null)}
      className="relative w-full cursor-pointer touch-none rounded-xl py-1 outline-offset-4"
    >
      <canvas ref={canvasRef} aria-hidden style={{ width: '100%', height }} className="block" />
      {hoverTime !== null && hoverX !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-lg border border-line bg-surface px-2 py-0.5 text-xs text-ink tabular-nums shadow-soft"
          style={{ left: Math.min(Math.max(hoverX, 24), width - 24) }}
        >
          {format.duration(hoverTime * 1000)}
        </div>
      )}
    </div>
  );
}
