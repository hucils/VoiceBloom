import { Info, Target } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import type { RecordingAnalysis } from '../../audio/analysis';
import { hzToNote } from '../../audio/pitchMath';
import { Button } from '../../components/Button';
import { Callout } from '../../components/Layout';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '../../i18n/I18nContext';
import { estimateFemininity } from '../../insights/femininity';
import { useSettings } from '../../state/SettingsContext';
import { EstimateScale } from '../viz/EstimateScale';

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/** A stat tile: sentence-case label, a sans value, optional muted detail. */
function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-4 py-3">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>
      {detail && <dd className="text-xs text-ink-muted">{detail}</dd>}
    </div>
  );
}

/** Descriptive measurements for a recording. Information only; no scores. */
export function RecordingStats({ analysis }: { analysis: RecordingAnalysis | null }) {
  const { t, format } = useI18n();
  const { settings, update } = useSettings();
  const toast = useToast();
  if (!analysis) return null;

  const { summary, resonance } = analysis;
  if (!summary) return <p className="text-sm text-ink-muted">{t('stats.noPitch')}</p>;

  const note = settings.showNoteNames ? hzToNote(summary.medianHz) : null;
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t('stats.typicalPitch')}
          value={format.hz(summary.medianHz)}
          detail={note ? format.note(note.pitchClass, note.octave) : undefined}
        />
        <Stat
          label={t('stats.typicalRange')}
          value={t('stats.rangeValue', { low: format.integer(summary.lowHz), high: format.hz(summary.highHz) })}
          detail={t('common.semitones', { count: oneDecimal(summary.rangeSemitones) })}
        />
        <Stat
          label={t('stats.variation')}
          value={t('common.semitones', { count: oneDecimal(summary.variationSemitones) })}
        />
        {resonance ? (
          <Stat label={t('stats.resonance')} value={format.hz(resonance.formantSpacingHz)} detail={t('stats.resonanceDetail')} />
        ) : (
          <Stat label={t('stats.voicedTime')} value={t('common.seconds', { count: oneDecimal(summary.voicedSeconds) })} />
        )}
      </dl>
      {resonance && <p className="text-xs text-ink-muted">{t('stats.resonanceHint')}</p>}
      <Button
        variant="ghost"
        size="sm"
        icon={Target}
        onClick={async () => {
          await update({ practiceBand: { low: Math.round(summary.lowHz), high: Math.round(summary.highHz) } });
          toast(t('stats.bandSaved'));
        }}
      >
        {t('stats.useAsBand')}
      </Button>
    </div>
  );
}

function EstimatePart({ label, score }: { label: string; score: number }) {
  const { t } = useI18n();
  return (
    <div>
      <dt className="flex justify-between text-xs text-ink-muted">
        <span>{label}</span>
        <span className="font-semibold text-ink tabular-nums">{score}</span>
      </dt>
      <dd className="mt-1.5">
        <EstimateScale
          size="sm"
          score={score}
          startLabel={t('femininity.scaleStart')}
          endLabel={t('femininity.scaleEnd')}
          summary={`${label}: ${score}`}
        />
      </dd>
    </div>
  );
}

/**
 * The optional femininity estimate. Renders nothing unless the person turned
 * it on in Settings; it is computed here, on display, and never stored.
 */
export function FemininityCard({ analysis }: { analysis: RecordingAnalysis | null }) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const headingId = useId();
  if (!settings.showFemininityEstimate || !analysis) return null;

  const result = estimateFemininity(analysis.summary, analysis.resonance);
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h3 id={headingId} className="text-lg text-ink">
        {t('femininity.title')}
      </h3>
      <p className="mt-0.5 text-sm text-ink-muted">{t('femininity.subtitle')}</p>

      {result.status === 'ok' ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-ink">{result.estimate.score}</span>
              <span className="text-sm text-ink-muted">{t('femininity.outOf')}</span>
            </p>
            <p className="text-sm text-ink-muted">
              {t('femininity.range', { low: result.estimate.low, high: result.estimate.high })}
            </p>
          </div>
          <EstimateScale
            score={result.estimate.score}
            low={result.estimate.low}
            high={result.estimate.high}
            startLabel={t('femininity.scaleStart')}
            endLabel={t('femininity.scaleEnd')}
            summary={t('femininity.scaleSummary', {
              score: result.estimate.score,
              low: result.estimate.low,
              high: result.estimate.high,
            })}
          />
          <dl className="grid gap-4 sm:grid-cols-2">
            <EstimatePart label={t('femininity.pitchPart')} score={result.estimate.pitchScore} />
            <EstimatePart label={t('femininity.resonancePart')} score={result.estimate.resonanceScore} />
          </dl>
          {result.estimate.lowConfidence && (
            <Callout icon={Info} tone="caution">
              {t('femininity.lowConfidence')}
            </Callout>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          {t(result.status === 'no-resonance' ? 'femininity.noResonance' : 'femininity.notEnoughSpeech')}
        </p>
      )}

      <p className="mt-4 text-xs text-ink-muted">{t('femininity.caveat')}</p>
      <details className="mt-2 text-xs text-ink-muted">
        <summary className="cursor-pointer font-medium text-accent-ink">{t('femininity.howItWorks')}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t('femininity.explanationPitch')}</li>
          <li>{t('femininity.explanationResonance')}</li>
          <li>{t('femininity.explanationLimits')}</li>
        </ul>
      </details>
    </section>
  );
}
