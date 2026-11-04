/**
 * Pure helpers that combine lesson content with saved progress. The progress
 * shape is declared structurally so this module does not depend on storage.
 */
import type { Lesson, SkillAreaId } from './types';

export type LessonStatus = 'not-started' | 'in-progress' | 'completed';

export interface ProgressSnapshot {
  lessonId: string;
  completedStepIds: readonly string[];
  currentStepId: string | null;
  completedAt: number | null;
  updatedAt: number;
}

export function lessonStatus(progress: ProgressSnapshot | undefined): LessonStatus {
  if (!progress) return 'not-started';
  return progress.completedAt !== null ? 'completed' : 'in-progress';
}

/** Which step to open: where the person left off, or the start for new and completed lessons. */
export function resumeStepIndex(lesson: Lesson, progress: ProgressSnapshot | undefined): number {
  if (!progress || progress.completedAt !== null) return 0;
  if (progress.currentStepId) {
    const current = lesson.steps.findIndex((step) => step.id === progress.currentStepId);
    if (current >= 0) return current;
  }
  const firstOpen = lesson.steps.findIndex((step) => !progress.completedStepIds.includes(step.id));
  return firstOpen >= 0 ? firstOpen : 0;
}

/** Share of a lesson's steps marked complete, in [0, 1]. */
export function stepCompletion(lesson: Lesson, progress: ProgressSnapshot | undefined): number {
  if (!progress) return 0;
  if (progress.completedAt !== null) return 1;
  const done = lesson.steps.filter((step) => progress.completedStepIds.includes(step.id)).length;
  return lesson.steps.length === 0 ? 0 : done / lesson.steps.length;
}

/**
 * What to suggest next: the most recently touched unfinished lesson, otherwise
 * the first lesson not yet started. Null when everything is complete.
 */
export function suggestLesson(
  lessons: readonly Lesson[],
  progress: readonly ProgressSnapshot[],
): { lesson: Lesson; status: LessonStatus } | null {
  const byId = new Map(progress.map((item) => [item.lessonId, item]));
  const inProgress = progress
    .filter((item) => item.completedAt === null && lessons.some((lesson) => lesson.id === item.lessonId))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (inProgress) {
    const lesson = lessons.find((candidate) => candidate.id === inProgress.lessonId)!;
    return { lesson, status: 'in-progress' };
  }
  const fresh = lessons.find((lesson) => !byId.has(lesson.id));
  return fresh ? { lesson: fresh, status: 'not-started' } : null;
}

export interface ProgressSummary {
  completed: number;
  total: number;
  byArea: ReadonlyMap<SkillAreaId, { completed: number; total: number }>;
}

export function summarizeProgress(
  lessons: readonly Lesson[],
  progress: readonly ProgressSnapshot[],
): ProgressSummary {
  const byId = new Map(progress.map((item) => [item.lessonId, item]));
  const byArea = new Map<SkillAreaId, { completed: number; total: number }>();
  let completed = 0;
  for (const lesson of lessons) {
    const area = byArea.get(lesson.area) ?? { completed: 0, total: 0 };
    area.total++;
    if (lessonStatus(byId.get(lesson.id)) === 'completed') {
      area.completed++;
      completed++;
    }
    byArea.set(lesson.area, area);
  }
  return { completed, total: lessons.length, byArea };
}
