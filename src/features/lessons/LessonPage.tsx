import { ArrowLeft, ArrowRight, Check, CircleCheck, Clock, Flower2, Lightbulb, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { Callout, Chip } from '../../components/Layout';
import { useI18n } from '../../i18n/I18nContext';
import { getArea, getLesson, nextLessonAfter } from '../../lessons/catalog';
import { resumeStepIndex } from '../../lessons/progress';
import type { Lesson, LessonStep } from '../../lessons/types';
import { useRepositories } from '../../state/DataContext';
import { useLessonProgress } from '../../state/queries';
import { VoiceStudio } from '../voice/VoiceStudio';
import { AreaIcon } from './areaIcons';
import { BreathingGuide } from './BreathingGuide';
import { ReflectionForm } from './ReflectionForm';

function StepContent({ lesson, step, index }: { lesson: Lesson; step: LessonStep; index: number }) {
  const { t, l } = useI18n();
  return (
    <div className="space-y-6">
      {index === 0 && (
        <Card tone="soft" className="!p-5">
          <h3 className="text-sm font-semibold text-ink-muted">{t('lesson.goals')}</h3>
          <ul className="mt-3 space-y-2">
            {lesson.goals.map((goal, goalIndex) => (
              <li key={goalIndex} className="flex gap-2.5 text-ink">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-accent" />
                {l(goal)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="max-w-prose space-y-4 text-[1.0625rem] leading-relaxed text-ink">
        {step.body.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex}>{l(paragraph)}</p>
        ))}
      </div>

      {step.tips && step.tips.length > 0 && (
        <Callout icon={Lightbulb} title={t('lesson.tips')} tone="accent">
          <ul className="list-disc space-y-1 pl-4">
            {step.tips.map((tip, tipIndex) => (
              <li key={tipIndex}>{l(tip)}</li>
            ))}
          </ul>
        </Callout>
      )}

      {step.type === 'practice' && step.exercise?.kind === 'voice' && (
        <VoiceStudio
          showPitch={step.exercise.showPitch}
          showLevel={step.exercise.showLevel}
          showSteadiness={step.exercise.showSteadiness}
          recording={step.exercise.recording}
          prompts={step.exercise.prompts}
          lessonId={lesson.id}
          stepId={step.id}
        />
      )}
      {step.type === 'practice' && step.exercise?.kind === 'breathing' && <BreathingGuide exercise={step.exercise} />}
      {step.type === 'reflect' && <ReflectionForm lessonId={lesson.id} prompt={step.prompt} />}
    </div>
  );
}

function LessonComplete({ lesson, onRestart }: { lesson: Lesson; onRestart: () => void }) {
  const { t, l } = useI18n();
  const next = nextLessonAfter(lesson.id);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <Card className="flex animate-fade-up flex-col items-center gap-4 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-calm-soft text-calm">
        <Flower2 aria-hidden className="size-8" />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="text-3xl text-ink outline-none">
        {t('lesson.completeTitle')}
      </h2>
      <p className="max-w-md text-ink-muted">{t('lesson.completeBody')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {next && (
          <ButtonLink to={`/lessons/${next.id}`} iconEnd={ArrowRight}>
            {t('lesson.nextLesson')}: {l(next.title)}
          </ButtonLink>
        )}
        <Button variant="secondary" icon={RotateCcw} onClick={onRestart}>
          {t('lesson.reviewLesson')}
        </Button>
        <ButtonLink to="/lessons" variant="ghost">
          {t('lesson.backToLessons')}
        </ButtonLink>
      </div>
    </Card>
  );
}

function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { t, l, format } = useI18n();
  const repos = useRepositories();
  const progress = useLessonProgress(lesson.id);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocus = useRef(false);

  // Until the person navigates, open the step they left off on.
  const index = chosenIndex ?? (progress === undefined ? null : resumeStepIndex(lesson, progress ?? undefined));

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [index, finished]);

  if (index === null) return null; // progress is loading (a few milliseconds)

  const step = lesson.steps[index]!;
  const area = getArea(lesson.area);
  const completed = new Set(progress?.completedStepIds ?? []);

  const goTo = (target: number) => {
    shouldFocus.current = true;
    setFinished(false);
    setChosenIndex(target);
    void repos.progress.setCurrentStep(lesson.id, lesson.steps[target]!.id);
  };

  const advance = async () => {
    const next = lesson.steps[index + 1];
    await repos.progress.completeStep(lesson.id, step.id, next?.id ?? null);
    if (next) {
      goTo(index + 1);
    } else {
      await repos.progress.completeLesson(lesson.id);
      setFinished(true);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {t('lesson.backToLessons')}
      </Link>

      <header className="animate-fade-up space-y-3">
        <div className="flex items-center gap-2">
          <AreaIcon area={area.id} size="sm" />
          <span className="text-sm font-medium text-accent-ink">{l(area.title)}</span>
        </div>
        <h1 className="text-3xl text-ink sm:text-4xl">{l(lesson.title)}</h1>
        <p className="max-w-prose text-ink-muted">{l(lesson.summary)}</p>
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Clock aria-hidden className="size-3.5" />
          {t('common.minutes', { count: lesson.minutes })} · {t('lessons.steps', { count: lesson.steps.length })}
          {progress?.completedAt && (
            <span className="ml-2 inline-flex items-center gap-1 text-calm">
              <CircleCheck aria-hidden className="size-3.5" />
              {format.date(progress.completedAt)}
            </span>
          )}
        </p>
      </header>

      <nav aria-label={t('lesson.stepsNav')}>
        <ol className="flex gap-1.5">
          {lesson.steps.map((candidate, candidateIndex) => {
            const current = !finished && candidateIndex === index;
            const done = completed.has(candidate.id);
            return (
              <li key={candidate.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => goTo(candidateIndex)}
                  aria-current={current ? 'step' : undefined}
                  aria-label={t('lesson.goToStep', { number: candidateIndex + 1, title: l(candidate.title) })}
                  className="group flex w-full flex-col gap-1.5 py-2 text-left"
                >
                  <span
                    className={`h-1.5 rounded-full transition-colors ${
                      current ? 'bg-accent' : done ? 'bg-accent/45' : 'bg-line-strong group-hover:bg-accent/30'
                    }`}
                  />
                  <span className={`hidden truncate text-xs sm:block ${current ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                    {l(candidate.title)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {finished ? (
        <LessonComplete lesson={lesson} onRestart={() => goTo(0)} />
      ) : (
        <article key={step.id} className="animate-fade-up space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Chip>{t(`lesson.stepTypes.${step.type}`)}</Chip>
              <span className="text-sm text-ink-muted">
                {t('lesson.stepOf', { current: index + 1, total: lesson.steps.length })}
              </span>
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-2xl text-ink outline-none sm:text-3xl">
              {l(step.title)}
            </h2>
          </div>
          <StepContent lesson={lesson} step={step} index={index} />
          <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => goTo(index - 1)} disabled={index === 0}>
              {t('lesson.previous')}
            </Button>
            <Button
              icon={index === lesson.steps.length - 1 ? Check : undefined}
              iconEnd={index === lesson.steps.length - 1 ? undefined : ArrowRight}
              onClick={() => void advance()}
            >
              {index === lesson.steps.length - 1 ? t('lesson.finish') : t('lesson.next')}
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}

export function LessonPage() {
  const { t } = useI18n();
  const { lessonId } = useParams();
  const lesson = getLesson(lessonId);
  if (!lesson) {
    return (
      <Card className="text-center">
        <p className="text-ink-muted">{t('lesson.notFound')}</p>
        <ButtonLink to="/lessons" variant="secondary" className="mt-4">
          {t('lesson.backToLessons')}
        </ButtonLink>
      </Card>
    );
  }
  // A key per lesson resets the player when moving between lessons.
  return <LessonPlayer key={lesson.id} lesson={lesson} />;
}
