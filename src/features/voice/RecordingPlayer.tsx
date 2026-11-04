import { LoaderCircle, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { RecordingAnalysis } from '../../audio/analysis';
import { ClipPlayer } from '../../audio/browserAudio';
import { useI18n } from '../../i18n/I18nContext';
import { useSettings } from '../../state/SettingsContext';
import { PitchContour } from '../viz/PitchCharts';
import { Waveform } from '../viz/Waveform';

/**
 * Loads audio once on mount (callers remount with a `key` to switch clips)
 * and tracks the playback position on every frame while playing.
 */
function useClipPlayer(loadAudio: () => Promise<ArrayBuffer | undefined>) {
  const playerRef = useRef<ClipPlayer | null>(null);
  const loadRef = useRef(loadAudio);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const player = new ClipPlayer();
    playerRef.current = player;
    let active = true;
    player.onStateChange = () => {
      if (!active) return;
      setPlaying(player.isPlaying);
      setCurrentTime(player.currentTime);
    };
    loadRef
      .current()
      .then(async (data) => {
        if (!data) throw new Error('Audio not found');
        const seconds = await player.load(data);
        if (!active) return;
        setDuration(seconds);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        console.warn('VoiceBloom could not load this recording for playback.', error);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      player.dispose();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      setCurrentTime(playerRef.current?.currentTime ?? 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return {
    status,
    duration,
    playing,
    currentTime,
    toggle() {
      const player = playerRef.current;
      if (!player) return;
      if (player.isPlaying) player.pause();
      else void player.play();
    },
    seek(seconds: number) {
      playerRef.current?.seek(seconds);
      setCurrentTime(seconds);
    },
  };
}

interface RecordingPlayerProps {
  loadAudio: () => Promise<ArrayBuffer | undefined>;
  analysis: RecordingAnalysis | null;
  durationMs: number;
}

export function RecordingPlayer({ loadAudio, analysis, durationMs }: RecordingPlayerProps) {
  const { t, format } = useI18n();
  const { settings } = useSettings();
  const player = useClipPlayer(loadAudio);
  const duration = player.duration || durationMs / 1000;
  const peaks = analysis?.peaks ?? [];
  const showCursor = player.playing || player.currentTime > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={player.toggle}
          disabled={player.status !== 'ready'}
          aria-label={player.playing ? t('player.pause') : t('player.play')}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-soft transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {player.status === 'loading' ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
          ) : player.playing ? (
            <Pause aria-hidden className="size-5" />
          ) : (
            <Play aria-hidden className="size-5 translate-x-px" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          {peaks.length > 0 ? (
            <Waveform peaks={peaks} durationSec={duration} currentTime={player.currentTime} onSeek={player.seek} />
          ) : (
            <div className="h-16 rounded-xl bg-surface-muted" />
          )}
          <p className="mt-1 text-right text-xs text-ink-muted tabular-nums">
            {format.duration(player.currentTime * 1000)} / {format.duration(duration * 1000)}
          </p>
        </div>
      </div>
      {player.status === 'error' && (
        <p role="alert" className="text-sm text-record">
          {t('player.loadError')}
        </p>
      )}
      {analysis?.summary && (
        <PitchContour
          analysis={analysis}
          range={settings.chartRange}
          band={settings.practiceBand}
          cursorTime={showCursor ? player.currentTime : null}
          showNoteNames={settings.showNoteNames}
          onSeek={player.seek}
        />
      )}
    </div>
  );
}
