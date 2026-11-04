import { Check, Circle, CircleAlert, LoaderCircle, Lock, Mic, MicOff, Square, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextField } from '../../components/Field';
import { Callout, Chip } from '../../components/Layout';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '../../i18n/I18nContext';
import type { LocalizedText } from '../../i18n/locales';
import { useRepositories } from '../../state/DataContext';
import { useSettings } from '../../state/SettingsContext';
import { LivePitchTrace } from '../viz/PitchCharts';
import { LevelMeter, PitchReadout, SteadinessReadout } from '../viz/LiveReadouts';
import { RecordingStats, FemininityCard } from './RecordingInsights';
import { RecordingPlayer } from './RecordingPlayer';
import { useVoiceSession, type RecordingDraft, type VoiceSession } from './useVoiceSession';

export interface VoiceStudioProps {
  showPitch: boolean;
  showLevel: boolean;
  showSteadiness?: boolean;
  recording: { maxSeconds: number; suggestedTitle?: LocalizedText } | null;
  prompts?: readonly LocalizedText[];
  lessonId?: string;
  stepId?: string;
}

function PromptList({ prompts }: { prompts: readonly LocalizedText[] }) {
  const { t, l } = useI18n();
  return (
    <Card tone="soft" className="!p-5">
      <h3 className="text-sm font-semibold text-ink-muted">{t('voice.promptsTitle')}</h3>
      <ol className="mt-3 space-y-2.5">
        {prompts.map((prompt, index) => (
          <li key={index} className="flex gap-3 font-display text-lg leading-snug text-ink [font-variation-settings:'SOFT'_100]">
            <span aria-hidden className="mt-1 text-sm font-semibold text-accent tabular-nums">
              {index + 1}
            </span>
            <span>{l(prompt)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function RecordingTimer({ startedAt, maxSeconds }: { startedAt: number; maxSeconds: number }) {
  const { t, format } = useI18n();
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  const elapsed = Math.max(0, now - startedAt);
  const remaining = Math.max(0, maxSeconds * 1000 - elapsed);
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden className="size-2.5 animate-soft-pulse rounded-full bg-record" />
      <span className="font-semibold text-ink tabular-nums">{format.duration(elapsed)}</span>
      <span className="text-ink-muted">{t('voice.remaining', { time: format.duration(remaining) })}</span>
    </span>
  );
}

function RecordControls({ session }: { session: VoiceSession }) {
  const { t } = useI18n();
  if (session.status === 'processing') {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-ink-muted" role="status">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        {t('voice.processing')}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {session.status === 'recording' ? (
          <>
            <Button variant="record" icon={Square} onClick={() => void session.stopRecording()}>
              {t('voice.stopRecording')}
            </Button>
            {session.recordingStartedAt !== null && (
              <RecordingTimer startedAt={session.recordingStartedAt} maxSeconds={session.maxRecordingSeconds} />
            )}
          </>
        ) : (
          <Button variant="record" icon={Circle} onClick={session.startRecording}>
            {t('voice.record')}
          </Button>
        )}
      </div>
      <p className="text-xs text-ink-muted">{t('voice.autoStopNote', { count: session.maxRecordingSeconds })}</p>
    </div>
  );
}

interface RecordingReviewProps {
  draft: RecordingDraft;
  suggestedTitle?: string;
  lessonId?: string;
  stepId?: string;
  onDone: () => void;
}

/** Listen back and decide: keep (saved on this device) or discard (gone). */
export function RecordingReview({ draft, suggestedTitle = '', lessonId, stepId, onDone }: RecordingReviewProps) {
  const { t } = useI18n();
  const repos = useRepositories();
  const toast = useToast();
  const [title, setTitle] = useState(suggestedTitle);
  const [saving, setSaving] = useState(false);
  const loadAudio = useCallback(async () => draft.audio, [draft]);

  const keep = async () => {
    setSaving(true);
    try {
      await repos.recordings.add({
        audio: draft.audio,
        mimeType: draft.mimeType,
        durationMs: draft.durationMs,
        analysis: draft.analysis,
        title,
        lessonId: lessonId ?? null,
        stepId: stepId ?? null,
      });
      toast(t('review.saved'));
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="animate-fade-up space-y-5" aria-label={t('review.title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl text-ink">{t('review.title')}</h3>
        <Chip icon={Lock} tone="calm">
          {t('app.privateBadge')}
        </Chip>
      </div>
      <RecordingPlayer key={draft.id} loadAudio={loadAudio} analysis={draft.analysis} durationMs={draft.durationMs} />
      {draft.analysis ? (
        <RecordingStats analysis={draft.analysis} />
      ) : (
        <p className="text-sm text-ink-muted">{t('review.analysisFailed')}</p>
      )}
      <FemininityCard analysis={draft.analysis} />
      <TextField
        label={t('review.titleLabel')}
        value={title}
        placeholder={t('common.untitled')}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
      />
      <p className="text-xs text-ink-muted">{t('review.privacyNote')}</p>
      <div className="flex flex-wrap gap-2">
        <Button icon={Check} onClick={() => void keep()} disabled={saving}>
          {t('review.keep')}
        </Button>
        <Button variant="ghost" icon={X} onClick={onDone} disabled={saving}>
          {t('review.discard')}
        </Button>
      </div>
    </Card>
  );
}

/**
 * The live practice surface: microphone, pitch, level and recording. Used by
 * lesson exercises and free practice alike.
 */
export function VoiceStudio({ showPitch, showLevel, showSteadiness, recording, prompts, lessonId, stepId }: VoiceStudioProps) {
  const { t, l } = useI18n();
  const { settings } = useSettings();
  const session = useVoiceSession({ maxRecordingSeconds: recording?.maxSeconds ?? 60 });
  const { status, tracker, error } = session;
  const active = tracker !== null && (status === 'live' || status === 'recording' || status === 'processing');

  return (
    <div className="space-y-4">
      {prompts && prompts.length > 0 && <PromptList prompts={prompts} />}

      <Card>
        {!active ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
                <Mic aria-hidden className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg text-ink">{t('voice.introTitle')}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">{t('voice.introBody')}</p>
              </div>
              <Button icon={Mic} onClick={() => void session.start()} disabled={status === 'starting'}>
                {status === 'starting' ? t('voice.requesting') : t('voice.start')}
              </Button>
            </div>
            {error && (
              <div role="alert">
                <Callout icon={CircleAlert} tone="caution">
                  {t(`voice.errors.${error}`)}
                </Callout>
              </div>
            )}
            {session.pausedInBackground && <p className="text-sm text-ink-muted">{t('voice.pausedInBackground')}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-calm">
                <span aria-hidden className="size-2 animate-soft-pulse rounded-full bg-calm" />
                {t('voice.listening')}
              </span>
              <Button variant="ghost" size="sm" icon={MicOff} onClick={session.stop} disabled={status !== 'live'}>
                {t('voice.stop')}
              </Button>
            </div>

            {showPitch && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <PitchReadout tracker={tracker} showNoteNames={settings.showNoteNames} />
                  {showSteadiness && <SteadinessReadout tracker={tracker} />}
                </div>
                <LivePitchTrace tracker={tracker} range={settings.chartRange} band={settings.practiceBand} />
                {settings.practiceBand && (
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <span aria-hidden className="h-3 w-5 rounded-sm border border-calm/50 bg-calm-soft" />
                    {t('voice.bandLegend')}: {settings.practiceBand.low}–{settings.practiceBand.high} Hz
                  </p>
                )}
              </div>
            )}
            {!showPitch && showSteadiness && <SteadinessReadout tracker={tracker} />}
            {showLevel && <LevelMeter tracker={tracker} />}
            {recording && <RecordControls session={session} />}
          </div>
        )}
      </Card>

      {session.draft && (
        <RecordingReview
          key={session.draft.id}
          draft={session.draft}
          suggestedTitle={recording?.suggestedTitle ? l(recording.suggestedTitle) : ''}
          lessonId={lessonId}
          stepId={stepId}
          onDone={session.clearDraft}
        />
      )}
    </div>
  );
}
