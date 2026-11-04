import type { LocalizedText } from '../i18n/locales';

export type SkillAreaId = 'foundations' | 'pitch' | 'resonance' | 'weight' | 'intonation' | 'articulation';

export interface SkillArea {
  id: SkillAreaId;
  title: LocalizedText;
  description: LocalizedText;
}

/** Live microphone exercise: what the voice studio shows and allows. */
export interface VoiceExercise {
  kind: 'voice';
  /** Live pitch trace and readout. */
  showPitch: boolean;
  /** Input level meter — useful when keeping loudness steady. */
  showLevel: boolean;
  /** Steadiness feedback while holding a note. */
  showSteadiness?: boolean;
  /** Recording for playback, or null when this exercise is for listening live only. */
  recording: { maxSeconds: number; suggestedTitle?: LocalizedText } | null;
  /** Lines to say or read aloud. */
  prompts?: readonly LocalizedText[];
}

/** Paced breathing with an animated guide. */
export interface BreathingExercise {
  kind: 'breathing';
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  cycles: number;
}

export type Exercise = VoiceExercise | BreathingExercise;

interface StepBase {
  /** Unique within its lesson; stored in progress records. */
  id: string;
  title: LocalizedText;
  body: readonly LocalizedText[];
  tips?: readonly LocalizedText[];
}

export interface LearnStep extends StepBase {
  type: 'learn';
}

export interface PracticeStep extends StepBase {
  type: 'practice';
  /** Omitted for guided activities that need no screen, such as the panting-dog exercise. */
  exercise?: Exercise;
}

export interface ReflectStep extends StepBase {
  type: 'reflect';
  /** Question offered as a starting point for a journal entry. */
  prompt: LocalizedText;
}

export type LessonStep = LearnStep | PracticeStep | ReflectStep;

export interface Lesson {
  /** Unique and stable: stored in progress, recordings and journal entries. */
  id: string;
  area: SkillAreaId;
  title: LocalizedText;
  summary: LocalizedText;
  goals: readonly LocalizedText[];
  minutes: number;
  steps: readonly LessonStep[];
}

/** Shorthand for writing bilingual content. */
export const text = (en: string, ro: string): LocalizedText => ({ en, ro });
