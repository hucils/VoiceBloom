import { CircleCheck, Clock } from 'lucide-react';
import { Link } from 'react-router';

import { ProgressMeter } from '../../components/Controls';
import { Chip, PageHeader } from '../../components/Layout';
import { useI18n } from '../../i18n/I18nContext';
import { lessonsInArea, SKILL_AREAS } from '../../lessons/catalog';
import { lessonStatus, type LessonStatus, type ProgressSnapshot } from '../../lessons/progress';
import type { Lesson } from '../../lessons/types';
import { useAllProgress } from '../../state/queries';
import { AreaIcon } from './areaIcons';

export function StatusChip({ status }: { status: LessonStatus }) {
  const { t } = useI18n();
  if (status === 'completed') {
    return (
      <Chip tone="calm" icon={CircleCheck}>
        {t('lessons.status.completed')}
      </Chip>
    );
  }
  return <Chip tone={status === 'in-progress' ? 'accent' : 'muted'}>{t(`lessons.status.${status}`)}</Chip>;
}

function LessonCard({
  lesson,
  progress,
  loading,
}: {
  lesson: Lesson;
  progress: ProgressSnapshot | undefined;
  /** While progress loads, show no status rather than a wrong one. */
  loading: boolean;
}) {
  const { t, l } = useI18n();
  const status = lessonStatus(progress);
  const done = progress ? lesson.steps.filter((step) => progress.completedStepIds.includes(step.id)).length : 0;
  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className="group flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-soft transition duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg text-ink group-hover:text-accent-ink">{l(lesson.title)}</h3>
        {!loading && <StatusChip status={status} />}
      </div>
      <p className="mt-1.5 flex-1 text-sm text-ink-muted">{l(lesson.summary)}</p>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
        <Clock aria-hidden className="size-3.5" />
        {t('common.minutes', { count: lesson.minutes })} · {t('lessons.steps', { count: lesson.steps.length })}
      </p>
      {status === 'in-progress' && (
        <ProgressMeter
          className="mt-3"
          value={done}
          max={lesson.steps.length}
          label={t('lesson.stepOf', { current: done, total: lesson.steps.length })}
        />
      )}
    </Link>
  );
}

export function LessonsPage() {
  const { t, l } = useI18n();
  const progress = useAllProgress();
  const byId = new Map((progress ?? []).map((item) => [item.lessonId, item]));

  return (
    <>
      <PageHeader title={t('lessons.title')} intro={t('lessons.intro')} />
      <div className="space-y-10">
        {SKILL_AREAS.map((area, index) => {
          const lessons = lessonsInArea(area.id);
          return (
            <section
              key={area.id}
              aria-labelledby={`area-${area.id}`}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="mb-4 flex items-center gap-3">
                <AreaIcon area={area.id} />
                <div className="min-w-0">
                  <h2 id={`area-${area.id}`} className="text-2xl text-ink">
                    {l(area.title)}
                  </h2>
                  <p className="text-sm text-ink-muted">{l(area.description)}</p>
                </div>
                <span className="ml-auto hidden shrink-0 text-xs text-ink-subtle sm:block">
                  {t('lessons.lessonCount', { count: lessons.length })}
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <LessonCard lesson={lesson} progress={byId.get(lesson.id)} loading={progress === undefined} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
