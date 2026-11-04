import { text, type Lesson } from '../types';

export const weightLessons: readonly Lesson[] = [
  {
    id: 'weight-light-and-full',
    area: 'weight',
    minutes: 8,
    title: text('Light and full', 'Ușor și plin'),
    summary: text(
      'Explore vocal weight: how light or full, airy or buzzy your voice feels.',
      'Explorează greutatea vocală: cât de ușoară sau de plină, de aerată sau de vibrantă se simte vocea ta.',
    ),
    goals: [
      text('Understand vocal weight', 'Înțelege greutatea vocală'),
      text('Move between lighter and fuller sounds', 'Treci de la sunete mai ușoare la sunete mai pline'),
      text('Keep loudness steady while weight changes', 'Păstrează volumul constant în timp ce schimbi greutatea'),
    ],
    steps: [
      {
        id: 'what-is-weight',
        type: 'learn',
        title: text('What is vocal weight?', 'Ce este greutatea vocală?'),
        body: [
          text(
            'Vocal weight describes how thick or thin your voice sounds. A heavier voice has a strong, buzzy quality; a lighter voice sounds softer and more flowing.',
            'Greutatea vocală descrie cât de groasă sau de subțire sună vocea. O voce mai grea are o calitate puternică, vibrantă; o voce mai ușoară sună mai moale și mai fluidă.',
          ),
          text(
            'It comes from how firmly your vocal folds meet as they vibrate. Weight is not the same as loudness or pitch: you can speak quietly with a heavy voice, or loudly with a light one.',
            'Ea depinde de cât de ferm se întâlnesc corzile vocale când vibrează. Greutatea nu este același lucru cu volumul sau înălțimea: poți vorbi încet cu o voce grea sau tare cu una ușoară.',
          ),
          text(
            'Many trans women work toward a lighter weight, because a heavy, buzzy quality is strongly associated with masculine voices. Light does not mean breathy or whispery: the aim is soft but clear.',
            'Multe femei trans lucrează spre o greutate mai ușoară, pentru că o calitate grea și vibrantă este puternic asociată cu vocile masculine. Ușor nu înseamnă aerat sau șoptit: scopul este un sunet moale, dar clar.',
          ),
        ],
      },
      {
        id: 'sigh-to-speech',
        type: 'practice',
        title: text('Sigh to speech', 'De la oftat la vorbire'),
        body: [
          text(
            'Let out an easy sigh on “haaa”. Then say a light “hmm?”, as if you are curious, and follow it with a gentle “hello”. This is a lighter weight.',
            'Lasă să-ți scape un oftat ușor pe „haaa”. Apoi spune un „hmm?” ușor, ca și cum ai fi curioasă, și continuă cu un „bună” blând. Aceasta este o greutate mai ușoară.',
          ),
          text(
            'For contrast, say a firm “uh-oh!” as if you dropped something. Notice the extra buzz. Try to keep the level meter about the same for both.',
            'Pentru contrast, spune un „ups!” ferm, ca atunci când scapi ceva pe jos. Observă vibrația în plus. Încearcă să păstrezi indicatorul de volum cam la același nivel în ambele cazuri.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: false, showLevel: true, recording: { maxSeconds: 30 } },
      },
      {
        id: 'weight-dial',
        type: 'practice',
        title: text('The weight dial', 'Butonul greutății'),
        body: [
          text(
            'Imagine a dial from 1 (very light, almost airy) to 5 (very full and buzzy). Say each line at 4, then 3, then 2, getting lighter each time while your volume stays the same.',
            'Imaginează-ți un buton cu trepte de la 1 (foarte ușor, aproape aerat) la 5 (foarte plin și vibrant). Spune fiecare rând pe treapta 4, apoi 3, apoi 2, tot mai ușor de fiecare dată, cu același volum.',
          ),
          text(
            'Record your favourite and notice which setting feels comfortable to sustain.',
            'Înregistrează varianta preferată și observă ce treaptă îți e comod să menții.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: false,
          showLevel: true,
          recording: { maxSeconds: 60 },
          prompts: [
            text('Hello there.', 'Bună ziua.'),
            text('How has your day been?', 'Cum a fost ziua ta?'),
            text('It is lovely to meet you.', 'Mă bucur să te cunosc.'),
          ],
        },
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Lighter does not have to mean quieter or weaker. Notice which setting feels both light and easy to keep up.',
            'Mai ușor nu trebuie să însemne mai încet sau mai slab. Observă ce treaptă se simte în același timp ușoară și ușor de menținut.',
          ),
        ],
        prompt: text(
          'Which weight felt most comfortable? Which felt most like you?',
          'Ce greutate ți s-a părut cea mai comodă? Care ți s-a potrivit cel mai bine?',
        ),
      },
    ],
  },
  {
    id: 'weight-easy-tone',
    area: 'weight',
    minutes: 10,
    title: text('An easy, clear tone', 'Un ton ușor și clar'),
    summary: text(
      'Find balanced airflow with straw phonation and carry it into sentences.',
      'Găsește un flux de aer echilibrat cu exercițiul cu paiul și transferă-l în propoziții.',
    ),
    goals: [
      text('Try a voice-friendly straw exercise', 'Încearcă un exercițiu cu paiul, prietenos cu vocea'),
      text('Find the middle between breathy and pressed', 'Găsește echilibrul între aerat și apăsat'),
      text('Keep an easy tone through sentences', 'Păstrează un ton ușor de-a lungul propozițiilor'),
    ],
    steps: [
      {
        id: 'breathy-pressed-balanced',
        type: 'learn',
        title: text('Breathy, pressed and balanced', 'Aerat, apăsat și echilibrat'),
        body: [
          text(
            'When the vocal folds meet too loosely, extra air escapes and the voice sounds breathy. When they press too hard, the voice sounds tight. In between is a clear, easy tone.',
            'Când corzile vocale se întâlnesc prea lejer, scapă aer în plus și vocea sună aerată. Când apasă prea tare, vocea sună încordată. Între cele două se află un ton clar și ușor.',
          ),
          text(
            'Breathiness can help while you explore lighter sounds, but over long periods it can tire the voice. Aim for clear and easy.',
            'Un sunet aerat poate fi de ajutor cât timp explorezi sunete mai ușoare, dar pe perioade lungi poate obosi vocea. Țintește spre un ton clar și relaxat.',
          ),
        ],
      },
      {
        id: 'straw-phonation',
        type: 'practice',
        title: text('Straw phonation', 'Fonația prin pai'),
        body: [
          text(
            'If you have a drinking straw, place it between your lips and hum through it, letting your pitch glide up and down. The straw gently balances the pressure on your vocal folds.',
            'Dacă ai un pai, pune-l între buze și fredonează prin el, lăsând înălțimea să urce și să coboare. Paiul echilibrează ușor presiunea asupra corzilor vocale.',
          ),
          text(
            'No straw? Use lip trills (“brrr”) or a gentle “vvv” instead. Keep going for about a minute.',
            'Nu ai pai? Folosește vibrația buzelor („brrr”) sau un „vvv” ușor. Continuă aproximativ un minut.',
          ),
        ],
        tips: [
          text(
            'Straw exercises are widely used by voice teachers and are gentle on the voice.',
            'Exercițiile cu paiul sunt folosite pe scară largă de profesorii de canto și sunt blânde cu vocea.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: true, showLevel: false, recording: null },
      },
      {
        id: 'clear-sentences',
        type: 'practice',
        title: text('Clear and easy sentences', 'Propoziții clare și relaxate'),
        body: [
          text(
            'Right after the straw, read these lines aloud with the same easy feeling. Keep your loudness steady; the level meter can help.',
            'Imediat după exercițiul cu paiul, citește aceste rânduri cu voce tare, păstrând aceeași senzație de ușurință. Menține volumul constant; indicatorul de volum te poate ajuta.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: false,
          showLevel: true,
          recording: { maxSeconds: 60 },
          prompts: [
            text('The morning light came softly through the window.', 'Lumina dimineții intra încet pe fereastră.'),
            text(
              'She walked along the river and talked with her sister for hours.',
              'S-a plimbat pe malul râului și a vorbit ore întregi cu sora ei.',
            ),
            text('Could you pass me the blue notebook, please?', 'Îmi dai, te rog, caietul albastru?'),
          ],
        },
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'An easy tone is one you could keep up for a whole conversation. Notice what helps you find it.',
            'Un ton ușor este unul pe care l-ai putea păstra pe tot parcursul unei conversații. Observă ce te ajută să îl găsești.',
          ),
        ],
        prompt: text(
          'How did your throat feel after the straw exercise?',
          'Cum s-a simțit gâtul după exercițiul cu paiul?',
        ),
      },
    ],
  },
];
