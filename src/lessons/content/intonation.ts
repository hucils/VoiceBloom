import { text, type Lesson } from '../types';

export const intonationLessons: readonly Lesson[] = [
  {
    id: 'intonation-melody',
    area: 'intonation',
    minutes: 8,
    title: text('The melody of speech', 'Melodia vorbirii'),
    summary: text(
      'See how your pitch rises and falls as you speak.',
      'Vezi cum urcă și coboară înălțimea vocii când vorbești.',
    ),
    goals: [
      text('Understand intonation', 'Înțelege intonația'),
      text('See rising and falling contours', 'Vezi contururile ascendente și descendente'),
      text('Play with questions and statements', 'Joacă-te cu întrebări și afirmații'),
    ],
    steps: [
      {
        id: 'speech-has-a-melody',
        type: 'learn',
        title: text('Speech has a melody', 'Vorbirea are o melodie'),
        body: [
          text(
            'Intonation is the way your pitch moves while you talk. It carries meaning and feeling: the same words can sound curious, certain, warm or playful depending on their melody.',
            'Intonația este felul în care se mișcă înălțimea vocii când vorbești. Ea transmite sens și emoție: aceleași cuvinte pot suna întrebător, convingător, cald sau jucăuș, în funcție de melodia lor.',
          ),
          text(
            'On the pitch trace, intonation appears as a shape, called a contour. Questions often rise at the end; statements often fall.',
            'Pe linia înălțimii, intonația apare ca o formă, numită contur. Întrebările urcă adesea la final; afirmațiile coboară adesea.',
          ),
        ],
      },
      {
        id: 'up-or-down',
        type: 'practice',
        title: text('Up or down', 'În sus sau în jos'),
        body: [
          text(
            'Say each pair below and watch the end of the line: does it go up or down? Exaggerate at first, then let it become natural.',
            'Spune fiecare pereche de mai jos și urmărește finalul liniei: urcă sau coboară? La început exagerează, apoi lasă intonația să devină naturală.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: false,
          recording: { maxSeconds: 45 },
          prompts: [
            text('Really? — Really.', 'Serios? — Serios.'),
            text('You’re coming? — You’re coming.', 'Vii și tu? — Vii și tu.'),
            text('It’s raining? — It’s raining.', 'Plouă? — Plouă.'),
          ],
        },
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Seeing your melody can make you more aware of it in everyday conversations too.',
            'Când îți vezi melodia vorbirii, devii mai atentă la ea și în conversațiile de zi cu zi.',
          ),
        ],
        prompt: text('Did any of the contours surprise you?', 'Te-a surprins vreunul dintre contururi?'),
      },
    ],
  },
  {
    id: 'intonation-expressive',
    area: 'intonation',
    minutes: 10,
    title: text('Expressive range', 'Expresivitate'),
    summary: text(
      'Use pitch to emphasise words and add colour to stories.',
      'Folosește înălțimea vocii ca să accentuezi cuvinte și să dai culoare poveștilor.',
    ),
    goals: [
      text('Move emphasis around a sentence', 'Mută accentul de la un cuvânt la altul'),
      text('Compare a flat and a melodic telling', 'Compară o variantă monotonă cu una melodioasă'),
      text('Notice your pitch variation', 'Observă variația înălțimii'),
    ],
    steps: [
      {
        id: 'melody-as-a-choice',
        type: 'learn',
        title: text('Melody as a choice', 'Melodia ca alegere'),
        body: [
          text(
            'We stress words with pitch, length and loudness. A wider melody sounds more animated; a steadier one sounds calmer and more matter-of-fact.',
            'Accentuăm cuvintele prin înălțime, durată și volum. O melodie mai amplă sună mai animat; una mai constantă sună mai calm și mai sobru.',
          ),
          text(
            'A wider, more varied melody is often associated with feminine speech, but it is a style, not a requirement: plenty of women speak with a calm, steady melody. Exploring the whole palette lets you choose how you want to sound in each moment.',
            'O melodie mai amplă și mai variată este adesea asociată cu vorbirea feminină, dar este un stil, nu o obligație: multe femei vorbesc cu o melodie calmă și constantă. Explorarea întregii palete îți permite să alegi cum vrei să suni în fiecare moment.',
          ),
        ],
      },
      {
        id: 'moving-the-emphasis',
        type: 'practice',
        title: text('Moving the emphasis', 'Mutarea accentului'),
        body: [
          text(
            'Say the sentence several times, stressing the word in capitals each time. Notice how the meaning shifts, and how the peak on the trace moves.',
            'Spune propoziția de mai multe ori, accentuând de fiecare dată cuvântul scris cu majuscule. Observă cum se schimbă sensul și cum se mută vârful de pe linie.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: false,
          recording: { maxSeconds: 60 },
          prompts: [
            text('SHE didn’t take the train today.', 'EA n-a luat trenul azi.'),
            text('She DIDN’T take the train today.', 'Ea N-A luat trenul azi.'),
            text('She didn’t take the TRAIN today.', 'Ea n-a luat TRENUL azi.'),
            text('She didn’t take the train TODAY.', 'Ea n-a luat trenul AZI.'),
          ],
        },
      },
      {
        id: 'tell-it-with-colour',
        type: 'practice',
        title: text('Tell it with colour', 'Spune-o cu culoare'),
        body: [
          text(
            'Read the line once in a flat, steady voice, then again as if you are sharing exciting news with your best friend. Record both.',
            'Citește rândul o dată cu o voce monotonă și constantă, apoi încă o dată ca și cum ai împărtăși o veste bună cu cea mai bună prietenă a ta. Înregistrează ambele variante.',
          ),
          text(
            'In your results, compare the pitch variation: the melodic version will usually show more.',
            'În rezultate, compară variația înălțimii: varianta melodioasă va arăta de obicei mai multă.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: false,
          recording: { maxSeconds: 45 },
          prompts: [
            text(
              'Guess what? I finally found the perfect little café, and it’s right around the corner!',
              'Știi ce? Am găsit în sfârșit cafeneaua perfectă și e chiar după colț!',
            ),
          ],
        },
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Melody is one of the most expressive parts of a voice, and one of the most personal.',
            'Melodia este una dintre cele mai expresive părți ale vocii și una dintre cele mai personale.',
          ),
        ],
        prompt: text(
          'Which version felt closer to the way you want to speak?',
          'Care variantă ți s-a părut mai aproape de felul în care vrei să vorbești?',
        ),
      },
    ],
  },
];
