import { text } from './types';

/** Short suggestions shown beside free practice. */
export const PRACTICE_IDEAS = [
  {
    title: text('Gentle sirens', 'Sirene blânde'),
    body: text(
      'Slide up and down on a soft “ooo” and watch a smooth hill appear.',
      'Alunecă în sus și în jos pe un „uuu” ușor și urmărește cum apare un deal lin.',
    ),
  },
  {
    title: text('Hum to words', 'De la fredonare la cuvinte'),
    body: text(
      'Start on an easy hum, then say a short phrase from the same place.',
      'Pornește de la o fredonare ușoară, apoi spune o frază scurtă din același loc.',
    ),
  },
  {
    title: text('Bright and light', 'Luminos și ușor'),
    body: text(
      'Say a sentence with a slight smile and a light touch, then listen back.',
      'Spune o propoziție cu un zâmbet ușor și o atingere delicată, apoi ascult-o.',
    ),
  },
  {
    title: text('Tell a little story', 'Spune o mică poveste'),
    body: text(
      'Describe your morning out loud and let your melody move freely.',
      'Descrie-ți dimineața cu voce tare și lasă melodia să se miște liber.',
    ),
  },
] as const;
