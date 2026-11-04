import { text, type Lesson } from '../types';

export const foundationsLessons: readonly Lesson[] = [
  {
    id: 'foundations-warm-up',
    area: 'foundations',
    minutes: 6,
    title: text('A gentle warm-up', 'O încălzire blândă'),
    summary: text(
      'Settle in, wake your voice up gently and learn how to practise kindly.',
      'Așază-te comod, trezește-ți vocea cu blândețe și află cum să exersezi cu grijă.',
    ),
    goals: [
      text('Learn the ground rules of healthy practice', 'Află regulile de bază ale unui exercițiu sănătos'),
      text('Relax your breath and body', 'Relaxează respirația și corpul'),
      text('Warm up with hums and sighs', 'Încălzește vocea cu fredonări și oftaturi'),
    ],
    steps: [
      {
        id: 'ground-rules',
        type: 'learn',
        title: text('Practising kindly', 'Exersează cu blândețe'),
        body: [
          text(
            'Voice training is a skill, like learning an instrument. Short, regular sessions of 10 to 15 minutes work better than long ones.',
            'Antrenarea vocii este o abilitate, ca învățarea unui instrument. Sesiunile scurte și regulate, de 10–15 minute, funcționează mai bine decât cele lungi.',
          ),
          text(
            'Your voice should never hurt. If you feel pain, tickling, strain or hoarseness, stop, sip some water and rest. You can always come back later.',
            'Vocea nu ar trebui să te doară niciodată. Dacă simți durere, mâncărime, încordare sau răgușeală, oprește-te, bea puțină apă și odihnește-te. Poți reveni oricând mai târziu.',
          ),
          text(
            'New sounds often feel strange or silly at first. That is part of exploring: there is no wrong way to sound while you learn.',
            'E normal ca sunetele noi să pară ciudate sau caraghioase la început. Face parte din explorare: nu există un mod greșit de a suna cât timp înveți.',
          ),
        ],
        tips: [
          text('Keep a glass of water nearby.', 'Ține un pahar cu apă la îndemână.'),
          text(
            'Find a space where you feel at ease making sound.',
            'Găsește un loc în care te simți relaxată când scoți sunete.',
          ),
          text(
            'VoiceBloom is not medical advice. For persistent voice problems, see a doctor or a speech-language pathologist.',
            'VoiceBloom nu oferă sfaturi medicale. Pentru probleme vocale persistente, consultă un medic sau un logoped.',
          ),
        ],
      },
      {
        id: 'breathing',
        type: 'practice',
        title: text('Settle your breath', 'Liniștește-ți respirația'),
        body: [
          text(
            'Sit or stand with relaxed shoulders. Breathe in gently through your nose, letting your belly expand, then breathe out slowly through your mouth.',
            'Stai jos sau în picioare, cu umerii relaxați. Inspiră ușor pe nas, lăsând abdomenul să se extindă, apoi expiră lent pe gură.',
          ),
          text(
            'Follow the circle: it grows as you breathe in and softens as you breathe out.',
            'Urmărește cercul: crește când inspiri și se micșorează când expiri.',
          ),
        ],
        tips: [
          text('Let your jaw hang loose.', 'Lasă maxilarul relaxat.'),
          text(
            'If you feel lightheaded, breathe normally for a moment.',
            'Dacă te simți amețită, respiră normal câteva clipe.',
          ),
        ],
        exercise: { kind: 'breathing', inhaleSeconds: 4, holdSeconds: 1, exhaleSeconds: 6, cycles: 5 },
      },
      {
        id: 'hums-and-sighs',
        type: 'practice',
        title: text('Hums and sighs', 'Fredonări și oftaturi'),
        body: [
          text(
            'With your lips closed, hum a gentle “mmm” at a comfortable pitch, as if you are agreeing with someone. Feel the buzz on your lips.',
            'Cu buzele închise, fredonează un „mmm” ușor, la o înălțime comodă, ca atunci când ești de acord cu cineva. Simte vibrația pe buze.',
          ),
          text(
            'Then sigh out on an “ahh”, letting your voice float from high to low. Repeat a few times and watch the pitch line move with you.',
            'Apoi oftează pe un „aaa”, lăsând vocea să coboare de sus în jos. Repetă de câteva ori și urmărește cum linia înălțimii se mișcă odată cu tine.',
          ),
        ],
        tips: [
          text(
            'Try lip trills (“brrr”) too: they are a lovely warm-up.',
            'Încearcă și vibrația buzelor („brrr”): este o încălzire excelentă.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: true, showLevel: true, recording: null },
      },
      {
        id: 'check-in',
        type: 'reflect',
        title: text('Check in', 'Cum te simți?'),
        body: [
          text(
            'Notice how your voice and body feel after warming up. A few words in your journal can help you spot patterns over time.',
            'Observă cum se simt vocea și corpul după încălzire. Câteva cuvinte în jurnal te pot ajuta să observi tipare în timp.',
          ),
        ],
        prompt: text('How does your voice feel right now?', 'Cum se simte vocea ta acum?'),
      },
    ],
  },
];
