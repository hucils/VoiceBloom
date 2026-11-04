import { TriangleAlert, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { dbToMeterValue } from '../../audio/level';
import { steadinessCents, type LivePitchTracker } from '../../audio/live';
import { hzToNote } from '../../audio/pitchMath';
import { useI18n } from '../../i18n/I18nContext';

/** Big live pitch number, refreshed ten times a second so it stays readable. */
export function PitchReadout({ tracker, showNoteNames }: { tracker: LivePitchTracker; showNoteNames: boolean }) {
  const { t, format } = useI18n();
  const [hz, setHz] = useState<number | null>(null);

  useEffect(() => {
    let lastUpdate = -1;
    return tracker.subscribe((frame) => {
      if (frame.time - lastUpdate < 0.1) return;
      lastUpdate = frame.time;
      setHz(frame.frequency);
    });
  }, [tracker]);

  const note = hz ? hzToNote(hz) : null;
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">{t('voice.pitchLabel')}</p>
      <p className="mt-1 flex items-baseline gap-2">
        {/* Tabular digits keep a fast-changing number from jittering sideways. */}
        <span className="text-4xl font-semibold text-ink tabular-nums">{hz ? format.integer(hz) : '—'}</span>
        <span className="text-ink-muted">Hz</span>
        {showNoteNames && note && (
          <span className="ml-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent-ink">
            {format.note(note.pitchClass, note.octave)}
          </span>
        )}
      </p>
      {!hz && <p className="mt-1 text-sm text-ink-muted">{t('voice.listeningHint')}</p>}
    </div>
  );
}

type LevelHint = 'quiet' | 'loud' | null;

/**
 * Input level meter. The fill moves on every frame without re-rendering; the
 * hint and accessible value update a few times per second.
 */
export function LevelMeter({ tracker }: { tracker: LivePitchTracker }) {
  const { t } = useI18n();
  const fillRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ db: number; hint: LevelHint }>({ db: -60, hint: null });

  useEffect(() => {
    let smoothed = -100;
    let voicedLevel = -30;
    let lastVoiced = -10;
    let lastLoud = -10;
    let lastUpdate = -1;
    return tracker.subscribe((frame) => {
      // Fast attack, gentle release, like a hardware meter.
      smoothed = Math.max(frame.levelDb, smoothed - 1.2);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${dbToMeterValue(smoothed, -60)})`;
      if (frame.levelDb > -3) lastLoud = frame.time;
      if (frame.frequency !== null) {
        voicedLevel = 0.92 * voicedLevel + 0.08 * frame.levelDb;
        lastVoiced = frame.time;
      }
      if (frame.time - lastUpdate < 0.25) return;
      lastUpdate = frame.time;
      let hint: LevelHint = null;
      if (frame.time - lastLoud < 1.5) hint = 'loud';
      else if (frame.time - lastVoiced < 2 && voicedLevel < -42) hint = 'quiet';
      setState({ db: Math.round(Math.max(-60, smoothed)), hint });
    });
  }, [tracker]);

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <Volume2 aria-hidden className="size-4 text-ink-subtle" />
          {t('voice.levelLabel')}
        </span>
        {state.hint && (
          <span className="inline-flex items-center gap-1 text-caution">
            <TriangleAlert aria-hidden className="size-3.5" />
            {t(state.hint === 'loud' ? 'voice.levelLoud' : 'voice.levelQuiet')}
          </span>
        )}
      </div>
      <div
        role="meter"
        aria-label={t('voice.levelLabel')}
        aria-valuemin={-60}
        aria-valuemax={0}
        aria-valuenow={state.db}
        aria-valuetext={`${state.db} dBFS`}
        className="h-2 overflow-hidden rounded-full bg-accent-soft"
      >
        <div
          ref={fillRef}
          className={`h-full origin-left rounded-full ${state.hint === 'loud' ? 'bg-caution' : 'bg-accent'}`}
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  );
}

/** How steadily a held note stays put, as a spread in cents. */
export function SteadinessReadout({ tracker }: { tracker: LivePitchTracker }) {
  const { t, format } = useI18n();
  const [cents, setCents] = useState<number | null>(null);

  useEffect(() => {
    let lastUpdate = -1;
    return tracker.subscribe((frame) => {
      if (frame.time - lastUpdate < 0.25) return;
      lastUpdate = frame.time;
      setCents(steadinessCents(tracker.history.all, frame.time));
    });
  }, [tracker]);

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">{t('voice.steadinessLabel')}</p>
      {cents === null ? (
        <p className="mt-1 text-sm text-ink-muted">{t('voice.steadinessHint')}</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
          {t('voice.steadinessValue', { cents: format.integer(cents) })}
        </p>
      )}
    </div>
  );
}
