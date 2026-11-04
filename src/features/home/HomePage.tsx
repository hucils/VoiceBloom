import { ArrowRight, AudioLines, Leaf, NotebookPen, Sparkles } from 'lucide-react';
import { Link } from 'react-router';

import { ButtonLink } from '../../components/Button';
import { Card, CardHeader } from '../../components/Card';
import { ProgressMeter } from '../../components/Controls';
import { useI18n } from '../../i18n/I18nContext';
import { getLesson, LESSONS, SKILL_AREAS } from '../../lessons/catalog';
import { suggestLesson, summarizeProgress } from '../../lessons/progress';
import { useAllProgress, useRecordings } from '../../state/queries';
import { AreaIcon } from '../lessons/areaIcons';

function greetingKey(hour: number) {
  if (hour < 12) return 'home.greetingMorning' as const;
  if (hour < 18) return 'home.greetingAfternoon' as const;
  return 'home.greetingEvening' as const;
}

export function HomePage() {
  const { t, l, format } = useI18n();
  const progress = useAllProgress();
  const recordings = useRecordings();
  const suggestion = progress ? suggestLesson(LESSONS, progress) : undefined;
  const summary = summarizeProgress(LESSONS, progress ?? []);

  return (
    <div className="space-y-6">
      <section className="relative animate-fade-up overflow-hidden rounded-4xl border border-line bg-gradient-to-br from-lavender-100 via-cream-50 to-blush-50 p-6 shadow-soft sm:p-8 dark:from-lavender-900/60 dark:via-surface dark:to-blush-700/20">
        <Sparkles aria-hidden className="absolute top-6 right-6 size-8 text-lavender-300 dark:text-lavender-700" />
        <h1 className="text-3xl text-ink sm:text-4xl">{t(greetingKey(new Date().getHours()))}</h1>
        <p className="mt-2 max-w-prose text-ink-muted">{t('home.intro')}</p>

        {suggestion !== undefined && (
          <div className="mt-6 rounded-3xl bg-surface/80 p-5 shadow-soft backdrop-blur-sm">
            {suggestion ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <AreaIcon area={suggestion.lesson.area} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-wide text-accent-ink uppercase">
                    {suggestion.status === 'in-progress' ? t('home.continueLabel') : t('home.startLabel')}
                  </p>
                  <p className="mt-0.5 font-display text-xl text-ink [font-variation-settings:'SOFT'_100]">
                    {l(suggestion.lesson.title)}
                  </p>
                  <p className="text-sm text-ink-muted">{l(suggestion.lesson.summary)}</p>
                </div>
                <ButtonLink to={`/lessons/${suggestion.lesson.id}`} iconEnd={ArrowRight}>
                  {suggestion.status === 'in-progress' ? t('home.continueLesson') : t('home.openLesson')}
                </ButtonLink>
              </div>
            ) : (
              <div>
                <p className="font-display text-xl text-ink">{t('home.allDoneLabel')}</p>
                <p className="mt-1 text-sm text-ink-muted">{t('home.allDoneBody')}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/practice"
          className="group animate-fade-up rounded-3xl border border-line bg-surface p-5 shadow-soft transition duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <AudioLines aria-hidden className="size-6 text-accent" />
          <h2 className="mt-3 text-xl text-ink">{t('home.practiceTitle')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('home.practiceBody')}</p>
        </Link>
        <Link
          to="/journal"
          className="group animate-fade-up rounded-3xl border border-line bg-surface p-5 shadow-soft transition duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <NotebookPen aria-hidden className="size-6 text-accent" />
          <h2 className="mt-3 text-xl text-ink">{t('home.journalTitle')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('home.journalBody')}</p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-up">
          <CardHeader
            title={t('home.pathTitle')}
            description={t('home.pathSummary', { completed: summary.completed, total: summary.total })}
          />
          <ul className="space-y-3.5">
            {SKILL_AREAS.map((area) => {
              const counts = summary.byArea.get(area.id) ?? { completed: 0, total: 0 };
              return (
                <li key={area.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-ink">{l(area.title)}</span>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {counts.completed}/{counts.total}
                    </span>
                  </div>
                  <ProgressMeter value={counts.completed} max={counts.total} label={l(area.title)} />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader
            title={t('home.recentTitle')}
            actions={
              recordings && recordings.length > 0 ? (
                <Link to="/recordings" className="text-sm font-medium text-accent-ink hover:underline">
                  {t('home.viewAll')}
                </Link>
              ) : undefined
            }
          />
          {recordings && recordings.length > 0 ? (
            <ul className="divide-y divide-line">
              {recordings.slice(0, 4).map((recording) => {
                const lesson = getLesson(recording.lessonId);
                return (
                  <li key={recording.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{recording.title || t('common.untitled')}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {format.relativeDay(recording.createdAt)} · {format.duration(recording.durationMs)}
                        {lesson && ` · ${l(lesson.title)}`}
                      </p>
                    </div>
                    {recording.analysis?.summary && (
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {format.hz(recording.analysis.summary.medianHz)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('home.noRecordings')}</p>
          )}
        </Card>
      </div>

      <p className="flex items-center justify-center gap-2 py-2 text-sm text-ink-muted">
        <Leaf aria-hidden className="size-4 text-calm" />
        {t('home.restNote')}
      </p>
    </div>
  );
}
