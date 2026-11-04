import type { ChangeNotifier } from './changes';
import type { VoiceBloomDB } from './db';
import type { LessonProgress } from './types';

export type ProgressRepository = ReturnType<typeof createProgressRepository>;

export function createProgressRepository(db: VoiceBloomDB, notifier: ChangeNotifier) {
  /** Read-modify-write in a single transaction, creating the record on first use. */
  async function mutate(
    lessonId: string,
    change: (current: LessonProgress, now: number) => LessonProgress,
    now: number,
  ): Promise<LessonProgress> {
    const tx = db.transaction('progress', 'readwrite');
    const existing = await tx.store.get(lessonId);
    const current: LessonProgress = existing ?? {
      lessonId,
      completedStepIds: [],
      currentStepId: null,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
    };
    const next: LessonProgress = { ...change(current, now), lessonId, updatedAt: now };
    await tx.store.put(next);
    await tx.done;
    notifier.notify('progress');
    return next;
  }

  return {
    list(): Promise<LessonProgress[]> {
      return db.getAll('progress');
    },

    get(lessonId: string): Promise<LessonProgress | undefined> {
      return db.get('progress', lessonId);
    },

    setCurrentStep(lessonId: string, stepId: string, now = Date.now()) {
      return mutate(lessonId, (progress) => ({ ...progress, currentStepId: stepId }), now);
    },

    completeStep(lessonId: string, stepId: string, nextStepId: string | null, now = Date.now()) {
      return mutate(
        lessonId,
        (progress) => ({
          ...progress,
          completedStepIds: progress.completedStepIds.includes(stepId)
            ? progress.completedStepIds
            : [...progress.completedStepIds, stepId],
          currentStepId: nextStepId ?? progress.currentStepId,
        }),
        now,
      );
    },

    /** Marks the lesson complete. The first completion time is kept if it is repeated. */
    completeLesson(lessonId: string, now = Date.now()) {
      return mutate(lessonId, (progress, time) => ({ ...progress, completedAt: progress.completedAt ?? time }), now);
    },

    async reset(lessonId: string): Promise<void> {
      await db.delete('progress', lessonId);
      notifier.notify('progress');
    },
  };
}
