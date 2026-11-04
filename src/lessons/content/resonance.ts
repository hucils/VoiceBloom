import { text, type Lesson } from '../types';

export const resonanceLessons: readonly Lesson[] = [
  {
    id: 'resonance-introduction',
    area: 'resonance',
    minutes: 8,
    title: text('What is resonance?', 'Ce este rezonanța?'),
    summary: text(
      'Discover how the shape of your throat and mouth colours your voice.',
      'Descoperă cum forma gâtului și a gurii îți colorează vocea.',
    ),
    goals: [
      text('Understand resonance in simple terms', 'Înțelege rezonanța în termeni simpli'),
      text('Hear brightness without pitch, using whispers', 'Auzi strălucirea vocii fără înălțime, folosind șoapta'),
      text('Feel your larynx move', 'Simte cum se mișcă laringele'),
    ],
    steps: [
      {
        id: 'your-voice-colour',
        type: 'learn',
        title: text('Your voice’s colour', 'Culoarea vocii tale'),
        body: [
          text(
            'The sound your vocal folds make travels through your throat and mouth before it reaches the air. The size and shape of that space colours the sound, and that colour is resonance.',
            'Sunetul produs de corzile vocale trece prin gât și prin gură înainte să ajungă în aer. Mărimea și forma acestui spațiu colorează sunetul; această culoare este rezonanța.',
          ),
          text(
            'A smaller space sounds brighter; a larger space sounds darker and fuller. You can change resonance without changing pitch, and it often shapes how a voice is heard even more than pitch does.',
            'Un spațiu mai mic sună mai luminos; unul mai mare sună mai întunecat și mai plin. Poți schimba rezonanța fără să schimbi înălțimea, iar ea influențează adesea felul în care este percepută o voce chiar mai mult decât înălțimea.',
          ),
          text(
            'Many voice coaches see brighter resonance as the heart of voice feminization. You will explore both directions, because feeling the contrast is the quickest way to find the brighter version of your voice.',
            'Mulți profesori de voce consideră rezonanța mai luminoasă esența feminizării vocii. Vei explora ambele direcții, pentru că simțirea contrastului este cea mai rapidă cale de a găsi varianta mai luminoasă a vocii tale.',
          ),
        ],
      },
      {
        id: 'whisper-vowels',
        type: 'practice',
        title: text('Whisper vowels', 'Vocale în șoaptă'),
        body: [
          text(
            'Whisper a long “eee”, then a long “ooo”. Whispering takes pitch out of the picture, so you can hear resonance on its own.',
            'Șoptește un „iii” lung, apoi un „uuu” lung. Șoapta scoate înălțimea din ecuație, așa că poți auzi rezonanța separat.',
          ),
          text(
            'Notice how “eee” sounds brighter and smaller, and “ooo” darker and bigger. Slide slowly between them: “eee-ooo-eee”.',
            'Observă cum „iii” sună mai luminos și mai mic, iar „uuu” mai întunecat și mai mare. Alunecă lent între ele: „iii-uuu-iii”.',
          ),
        ],
        tips: [
          text(
            'Record it and listen back: the difference is often clearer on playback.',
            'Înregistrează și ascultă: diferența e adesea mai clară la redare.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: false, showLevel: true, recording: { maxSeconds: 30 } },
      },
      {
        id: 'big-dog-small-dog',
        type: 'practice',
        title: text('Big dog, small dog', 'Câine mare, câine mic'),
        body: [
          text(
            'Rest a finger lightly on the bump at the front of your throat (your larynx). Pant gently like a big, sleepy dog: slow and deep. You may feel your larynx sit lower.',
            'Pune ușor un deget pe proeminența din fața gâtului (laringele). Gâfâie lin, ca un câine mare și somnoros: rar și adânc. S-ar putea să simți cum laringele coboară.',
          ),
          text(
            'Now pant like a small, excited dog: quick and light. You may feel your larynx rise. Switch between the two a few times, gently.',
            'Acum gâfâie ca un câine mic și entuziasmat: repede și ușor. S-ar putea să simți cum laringele urcă. Alternează de câteva ori între cele două, cu blândețe.',
          ),
          text(
            'The small dog points in the direction many trans women train toward: a slightly raised larynx brightens the voice. Later lessons build on this feeling.',
            'Câinele mic arată direcția spre care lucrează multe femei trans: un laringe ușor ridicat luminează vocea. Lecțiile următoare se bazează pe această senzație.',
          ),
        ],
        tips: [
          text(
            'Keep it soft, and stop if you feel dizzy or uncomfortable.',
            'Fă exercițiul cu blândețe și oprește-te dacă te simți amețită sau incomodă.',
          ),
        ],
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Resonance can be subtle at first. Many people start to hear it more clearly after a few sessions.',
            'La început, rezonanța poate fi greu de sesizat. Mulți oameni încep să o audă mai clar după câteva sesiuni.',
          ),
        ],
        prompt: text(
          'Which sounds felt most natural to you? Which felt new?',
          'Ce sunete ți s-au părut cele mai naturale? Care au fost noi pentru tine?',
        ),
      },
    ],
  },
  {
    id: 'resonance-shaping',
    area: 'resonance',
    minutes: 10,
    title: text('Shaping brightness', 'Modelarea strălucirii'),
    summary: text(
      'Use your tongue, lips and larynx to brighten your voice.',
      'Folosește limba, buzele și laringele ca să îți luminezi vocea.',
    ),
    goals: [
      text('Learn the three main tools of resonance', 'Află cele trei instrumente principale ale rezonanței'),
      text(
        'Record the same lines in your usual voice and brighter',
        'Înregistrează aceleași rânduri cu vocea obișnuită și mai luminos',
      ),
      text('Compare them with kind, curious ears', 'Compară-le cu urechi curioase și binevoitoare'),
    ],
    steps: [
      {
        id: 'three-tools',
        type: 'learn',
        title: text('Three tools', 'Trei instrumente'),
        body: [
          text(
            'Tongue: a tongue that sits forward and high in the mouth makes the space smaller and brighter; a tongue that sits back makes it larger and darker.',
            'Limba: o limbă poziționată în față și sus în gură micșorează spațiul și îl face mai luminos; o limbă retrasă îl mărește și îl face mai întunecat.',
          ),
          text(
            'Lips: a slight smile spreads the lips and brightens the sound; rounded lips lengthen the space and darken it.',
            'Buzele: un zâmbet ușor întinde buzele și luminează sunetul; buzele rotunjite lungesc spațiul și îl întunecă.',
          ),
          text(
            'Larynx: as you felt with the panting dogs, a higher larynx brightens and a lower larynx darkens. Small changes go a long way.',
            'Laringele: așa cum ai simțit la exercițiul cu câinii, un laringe mai sus luminează sunetul, iar unul mai jos îl întunecă. Schimbările mici contează mult.',
          ),
        ],
      },
      {
        id: 'usual-and-brighter',
        type: 'practice',
        title: text('Usual and brighter', 'Obișnuit și mai luminos'),
        body: [
          text(
            'Say each line twice: first in your usual voice, then brighter, with a slight smile, your tongue forward and a gentle “small dog” lift. Keep your pitch about the same both times, so you hear resonance on its own.',
            'Spune fiecare rând de două ori: întâi cu vocea obișnuită, apoi mai luminos, cu un zâmbet ușor, limba în față și o ridicare blândă, ca la „câinele mic”. Păstrează aproximativ aceeași înălțime de fiecare dată, ca să auzi rezonanța separat.',
          ),
          text('Record both versions so you can compare them.', 'Înregistrează ambele variante ca să le poți compara.'),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: false,
          recording: { maxSeconds: 60 },
          prompts: [
            text('Mee, may, mah, moh, moo.', 'Mi, me, ma, mo, mu.'),
            text('Leave the keys by the green tree.', 'Mi-e dor de vineri și de cireșe.'),
            text('Look at the full moon over the pool.', 'Uite luna rotundă pe cerul de toamnă.'),
          ],
        },
      },
      {
        id: 'listening-back',
        type: 'learn',
        title: text('Listening back', 'Ascultă cu atenție'),
        body: [
          text(
            'Your own voice sounds different from the inside, because you also hear it through your bones. Recordings capture what others hear, which can be surprising at first.',
            'Propria voce sună diferit din interior, pentru că o auzi și prin oasele capului. Înregistrările surprind ce aud ceilalți, iar asta poate fi surprinzător la început.',
          ),
          text(
            'Listen with headphones if you can, and try to describe what you hear (brighter, darker, warmer, thinner) rather than judging it as good or bad.',
            'Ascultă cu căști dacă poți și încearcă să descrii ce auzi (mai luminos, mai întunecat, mai cald, mai subțire), în loc să judeci în termeni de bine sau rău.',
          ),
        ],
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'There is no right amount of brightness. If a version sounds forced or cartoonish, dial it back: subtle changes often sound the most natural.',
            'Nu există o cantitate corectă de strălucire. Dacă o variantă sună forțat sau caricatural, redu intensitatea: schimbările subtile sună adesea cel mai natural.',
          ),
        ],
        prompt: text(
          'How would you describe the difference between your two versions?',
          'Cum ai descrie diferența dintre cele două variante?',
        ),
      },
    ],
  },
];
