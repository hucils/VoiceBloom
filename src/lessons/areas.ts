import { text, type SkillArea } from './types';

/** Skill areas, in the order they are taught. */
export const SKILL_AREAS: readonly SkillArea[] = [
  {
    id: 'foundations',
    title: text('Foundations', 'Fundamente'),
    description: text(
      'Gentle habits and warm-ups for healthy practice.',
      'Obiceiuri blânde și exerciții de încălzire pentru un antrenament sănătos.',
    ),
  },
  {
    id: 'pitch',
    title: text('Pitch', 'Înălțime'),
    description: text(
      'How high or low your voice sits, and how easily it moves.',
      'Cât de sus sau de jos se situează vocea și cât de ușor se mișcă.',
    ),
  },
  {
    id: 'resonance',
    title: text('Resonance', 'Rezonanță'),
    description: text(
      'The brightness or darkness your throat and mouth give your voice.',
      'Strălucirea sau întunecimea pe care gâtul și gura i-o dau vocii.',
    ),
  },
  {
    id: 'weight',
    title: text('Vocal weight', 'Greutate vocală'),
    description: text(
      'How light or full, airy or buzzy your voice feels.',
      'Cât de ușoară sau de plină, de aerată sau de vibrantă se simte vocea.',
    ),
  },
  {
    id: 'intonation',
    title: text('Intonation', 'Intonație'),
    description: text(
      'The melody of speech: how your pitch rises and falls.',
      'Melodia vorbirii: cum urcă și coboară înălțimea vocii.',
    ),
  },
  {
    id: 'articulation',
    title: text('Articulation', 'Articulație'),
    description: text('How you shape vowels and consonants.', 'Felul în care modelezi vocalele și consoanele.'),
  },
];
