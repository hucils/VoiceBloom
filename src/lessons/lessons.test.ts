// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { LOCALES, type LocalizedText } from '../i18n/locales';
import { isValidId } from '../persistence/validation';
import { CEDILLA_FORMS, findMasculineAddress } from '../test/romanian';
import { getArea, getLesson, LESSONS, lessonsInArea, nextLessonAfter, SKILL_AREAS } from './catalog';
import {
  lessonStatus,
  resumeStepIndex,
  stepCompletion,
  suggestLesson,
  summarizeProgress,
  type ProgressSnapshot,
} from './progress';
import type { Lesson } from './types';

function isLocalizedText(value: unknown): value is LocalizedText {
  return typeof value === 'object' && value !== null && LOCALES.every((locale) => locale in value);
}

/** Every bilingual string in a lesson, wherever it is nested. */
function collectTexts(value: unknown, found: LocalizedText[] = []): LocalizedText[] {
  if (isLocalizedText(value)) found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectTexts(item, found));
  else if (typeof value === 'object' && value !== null) Object.values(value).forEach((item) => collectTexts(item, found));
  return found;
}

describe('lesson catalog', () => {
  it('covers every required skill area', () => {
    for (const area of ['pitch', 'resonance', 'weight', 'intonation', 'articulation'] as const) {
      expect(lessonsInArea(area).length, area).toBeGreaterThan(0);
    }
    for (const area of SKILL_AREAS) expect(lessonsInArea(area.id).length, area.id).toBeGreaterThan(0);
  });

  it('uses unique, storable lesson and step ids', () => {
    const lessonIds = LESSONS.map((lesson) => lesson.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    for (const lesson of LESSONS) {
      expect(isValidId(lesson.id), lesson.id).toBe(true);
      const stepIds = lesson.steps.map((step) => step.id);
      expect(new Set(stepIds).size, lesson.id).toBe(stepIds.length);
      stepIds.forEach((id) => expect(isValidId(id), `${lesson.id}/${id}`).toBe(true));
    }
  });

  it('gives every lesson a practice step and ends it with a reflection', () => {
    for (const lesson of LESSONS) {
      expect(lesson.steps.some((step) => step.type === 'practice'), lesson.id).toBe(true);
      expect(lesson.steps.at(-1)?.type, lesson.id).toBe('reflect');
      expect(lesson.goals.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.minutes, lesson.id).toBeGreaterThan(0);
    }
  });

  it('keeps exercise settings within sensible limits', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.type !== 'practice' || !step.exercise) continue;
        const { exercise } = step;
        if (exercise.kind === 'voice' && exercise.recording) {
          expect(exercise.recording.maxSeconds).toBeGreaterThan(0);
          expect(exercise.recording.maxSeconds).toBeLessThanOrEqual(180);
        }
        if (exercise.kind === 'breathing') {
          expect(exercise.cycles).toBeGreaterThan(0);
          expect(exercise.inhaleSeconds).toBeGreaterThan(0);
          expect(exercise.exhaleSeconds).toBeGreaterThan(0);
          expect(exercise.holdSeconds).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('is fully translated, without stray whitespace', () => {
    const texts = [...LESSONS.flatMap((lesson) => collectTexts(lesson)), ...collectTexts(SKILL_AREAS)];
    expect(texts.length).toBeGreaterThan(200);
    for (const entry of texts) {
      for (const locale of LOCALES) {
        expect(entry[locale].trim(), JSON.stringify(entry)).not.toBe('');
        expect(entry[locale], JSON.stringify(entry)).toBe(entry[locale].trim());
      }
      // Longer passages that are identical in both languages were almost certainly never translated.
      if (entry.en.length > 24) expect(entry.ro, entry.en).not.toBe(entry.en);
    }
  });

  it('writes Romanian with comma-below ș and ț, not the cedilla look-alikes', () => {
    const romanian = [...LESSONS.flatMap((lesson) => collectTexts(lesson)), ...collectTexts(SKILL_AREAS)]
      .map((entry) => entry.ro)
      .join('\n');
    expect(romanian).not.toMatch(CEDILLA_FORMS);
    expect(romanian).toMatch(/[șț]/);
  });

  it('addresses the reader in the feminine in Romanian', () => {
    const offenders = LESSONS.flatMap((lesson) => collectTexts(lesson)).flatMap((entry) =>
      findMasculineAddress(entry.ro),
    );
    expect(offenders).toEqual([]);
  });

  it('looks lessons and areas up, and knows the recommended order', () => {
    const first = LESSONS[0]!;
    expect(getLesson(first.id)).toBe(first);
    expect(getLesson('nope')).toBeUndefined();
    expect(getLesson(null)).toBeUndefined();
    expect(getArea('pitch').id).toBe('pitch');
    expect(nextLessonAfter(first.id)).toBe(LESSONS[1]);
    expect(nextLessonAfter(LESSONS.at(-1)!.id)).toBeUndefined();
  });
});

describe('progress helpers', () => {
  const lesson: Lesson = LESSONS.find((candidate) => candidate.steps.length >= 3)!;
  const [stepA, stepB] = lesson.steps;
  const snapshot = (overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
    lessonId: lesson.id,
    completedStepIds: [],
    currentStepId: null,
    completedAt: null,
    updatedAt: 1,
    ...overrides,
  });

  it('derives a lesson status', () => {
    expect(lessonStatus(undefined)).toBe('not-started');
    expect(lessonStatus(snapshot())).toBe('in-progress');
    expect(lessonStatus(snapshot({ completedAt: 5 }))).toBe('completed');
  });

  it('resumes where the person left off', () => {
    expect(resumeStepIndex(lesson, undefined)).toBe(0);
    expect(resumeStepIndex(lesson, snapshot({ currentStepId: stepB!.id }))).toBe(1);
    expect(resumeStepIndex(lesson, snapshot({ completedStepIds: [stepA!.id] }))).toBe(1);
    expect(resumeStepIndex(lesson, snapshot({ currentStepId: 'removed-step', completedStepIds: [stepA!.id] }))).toBe(1);
    expect(resumeStepIndex(lesson, snapshot({ completedAt: 9, currentStepId: stepB!.id }))).toBe(0);
  });

  it('measures step completion', () => {
    expect(stepCompletion(lesson, undefined)).toBe(0);
    expect(stepCompletion(lesson, snapshot({ completedStepIds: [stepA!.id] }))).toBeCloseTo(1 / lesson.steps.length);
    expect(stepCompletion(lesson, snapshot({ completedAt: 3 }))).toBe(1);
  });

  it('suggests the most recent unfinished lesson, then the next new one', () => {
    const [l1, l2, l3] = LESSONS;
    expect(suggestLesson(LESSONS, [])).toEqual({ lesson: l1, status: 'not-started' });
    expect(
      suggestLesson(LESSONS, [
        { ...snapshot(), lessonId: l2!.id, updatedAt: 10 },
        { ...snapshot(), lessonId: l3!.id, updatedAt: 20 },
      ]),
    ).toEqual({ lesson: l3, status: 'in-progress' });
    expect(suggestLesson(LESSONS, [{ ...snapshot(), lessonId: l1!.id, completedAt: 1 }])).toEqual({
      lesson: l2,
      status: 'not-started',
    });
    expect(
      suggestLesson(
        LESSONS,
        LESSONS.map((item) => ({ ...snapshot(), lessonId: item.id, completedAt: 1 })),
      ),
    ).toBeNull();
  });

  it('summarises completion overall and per area', () => {
    const pitch = lessonsInArea('pitch');
    const summary = summarizeProgress(LESSONS, [{ ...snapshot(), lessonId: pitch[0]!.id, completedAt: 1 }]);
    expect(summary).toMatchObject({ completed: 1, total: LESSONS.length });
    expect(summary.byArea.get('pitch')).toEqual({ completed: 1, total: pitch.length });
    expect(summary.byArea.get('resonance')?.completed).toBe(0);
  });
});
