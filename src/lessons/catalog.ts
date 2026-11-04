import { SKILL_AREAS } from './areas';
import { articulationLessons } from './content/articulation';
import { foundationsLessons } from './content/foundations';
import { intonationLessons } from './content/intonation';
import { pitchLessons } from './content/pitch';
import { resonanceLessons } from './content/resonance';
import { weightLessons } from './content/weight';
import type { Lesson, SkillArea, SkillAreaId } from './types';

/** Every lesson, in the recommended order. */
export const LESSONS: readonly Lesson[] = [
  ...foundationsLessons,
  ...pitchLessons,
  ...resonanceLessons,
  ...weightLessons,
  ...intonationLessons,
  ...articulationLessons,
];

const lessonsById = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
const areasById = new Map(SKILL_AREAS.map((area) => [area.id, area]));

export { SKILL_AREAS };

export function getLesson(id: string | null | undefined): Lesson | undefined {
  return id ? lessonsById.get(id) : undefined;
}

export function getArea(id: SkillAreaId): SkillArea {
  const area = areasById.get(id);
  if (!area) throw new Error(`Unknown skill area: ${id}`);
  return area;
}

export function lessonsInArea(areaId: SkillAreaId): Lesson[] {
  return LESSONS.filter((lesson) => lesson.area === areaId);
}

/** The lesson after `id` in the recommended order, if any. */
export function nextLessonAfter(id: string): Lesson | undefined {
  const index = LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? LESSONS[index + 1] : undefined;
}
