import { text, type Lesson } from '../types';

export const pitchLessons: readonly Lesson[] = [
  {
    id: 'pitch-meet-your-voice',
    area: 'pitch',
    minutes: 8,
    title: text('Meet your speaking voice', 'Fă cunoștință cu vocea ta'),
    summary: text(
      'Learn what pitch is and record a baseline to look back on later.',
      'Află ce este înălțimea vocii și înregistrează un punct de plecare la care să revii mai târziu.',
    ),
    goals: [
      text('Understand what pitch measures, and what it does not', 'Înțelege ce măsoară înălțimea vocii și ce nu'),
      text('Record a baseline of your voice today', 'Înregistrează un punct de plecare al vocii tale de azi'),
      text('Learn to read your results', 'Învață să citești rezultatele'),
    ],
    steps: [
      {
        id: 'what-is-pitch',
        type: 'learn',
        title: text('What is pitch?', 'Ce este înălțimea vocii?'),
        body: [
          text(
            'Pitch is how high or low a sound is. When you speak, your vocal folds vibrate many times per second; that rate is measured in hertz (Hz). More vibrations per second sound higher.',
            'Înălțimea este cât de acut sau de grav sună un sunet. Când vorbești, corzile vocale vibrează de multe ori pe secundă; această frecvență se măsoară în herți (Hz). Mai multe vibrații pe secundă sună mai acut.',
          ),
          text(
            'Pitch is often the first thing people think of in voice feminization. It helps, but on its own it rarely does the job: resonance and vocal weight usually shape how a voice is heard even more, and pushing pitch too high can strain your voice and sound forced.',
            'Înălțimea este adesea primul lucru la care se gândesc oamenii când vine vorba de feminizarea vocii. Ajută, dar singură rareori este suficientă: rezonanța și greutatea vocală influențează de obicei și mai mult felul în care este percepută o voce, iar o înălțime forțată prea sus poate încorda vocea și poate suna artificial.',
          ),
          text(
            'VoiceBloom shows pitch as information, not as a score. There is no single “correct” number, and a number never says anything about who you are.',
            'VoiceBloom arată înălțimea ca informație, nu ca notă sau scor. Nu există un singur număr „corect”, iar un număr nu spune nimic despre cine ești.',
          ),
        ],
      },
      {
        id: 'baseline',
        type: 'practice',
        title: text('Record a baseline', 'Înregistrează punctul de plecare'),
        body: [
          text(
            'Speak in your everyday voice; there is no need to change anything. Start the microphone, press Record and read the lines below at a relaxed pace.',
            'Vorbește cu vocea ta obișnuită; nu e nevoie să schimbi nimic. Pornește microfonul, apasă Înregistrează și citește rândurile de mai jos într-un ritm relaxat.',
          ),
          text(
            'When you are done, keep the recording. In a few weeks you can listen back and hear how your voice has grown.',
            'La final, păstrează înregistrarea. Peste câteva săptămâni o poți asculta din nou ca să auzi cum a evoluat vocea ta.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: true,
          recording: { maxSeconds: 60, suggestedTitle: text('Baseline', 'Punct de plecare') },
          prompts: [
            text(
              'One, two, three, four, five, six, seven, eight, nine, ten.',
              'Unu, doi, trei, patru, cinci, șase, șapte, opt, nouă, zece.',
            ),
            text('Hello! This is my voice today.', 'Bună! Aceasta este vocea mea de azi.'),
            text(
              'I would love a cup of tea and a quiet afternoon.',
              'Mi-ar plăcea o ceașcă de ceai și o după-amiază liniștită.',
            ),
          ],
        },
      },
      {
        id: 'reading-results',
        type: 'learn',
        title: text('Reading your results', 'Cum să citești rezultatele'),
        body: [
          text(
            'Typical pitch is the middle of everything you said: half of your voiced sound was above it and half below. The typical range shows where most of your speech sat.',
            'Înălțimea tipică este mijlocul a tot ce ai spus: jumătate din sunetele vocale au fost deasupra ei, jumătate dedesubt. Intervalul tipic arată unde s-a situat cea mai mare parte a vorbirii tale.',
          ),
          text(
            'These numbers naturally change with mood, tiredness, time of day and what you are saying. Look at trends over weeks, not single days.',
            'Aceste numere variază firesc în funcție de stare, oboseală, momentul zilei și de ce spui. Urmărește tendințele de-a lungul săptămânilor, nu zilele luate separat.',
          ),
          text(
            'Semitones measure the distance between pitches the way musicians do. Twelve semitones make an octave.',
            'Semitonurile măsoară distanța dintre înălțimi, la fel ca în muzică. Douăsprezece semitonuri formează o octavă.',
          ),
        ],
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Hearing a recording of yourself can feel unusual. Be gentle with yourself: this is simply a starting point.',
            'Să-ți asculți propria înregistrare poate fi o experiență neobișnuită. Fii blândă cu tine: acesta este doar un punct de plecare.',
          ),
        ],
        prompt: text('What did you notice when you listened back?', 'Ce ai observat când ai ascultat înregistrarea?'),
      },
    ],
  },
  {
    id: 'pitch-explore-range',
    area: 'pitch',
    minutes: 10,
    title: text('Explore your range', 'Explorează-ți registrul'),
    summary: text(
      'Glide gently through your voice to discover the pitches that feel easy.',
      'Alunecă ușor prin voce ca să descoperi înălțimile care îți vin natural.',
    ),
    goals: [
      text('Warm up with sirens', 'Încălzește vocea cu sirene'),
      text('Find your comfortable low and high', 'Găsește-ți limitele comode, de jos și de sus'),
      text('Tell the difference between comfort and strain', 'Învață diferența dintre confort și încordare'),
    ],
    steps: [
      {
        id: 'comfort-first',
        type: 'learn',
        title: text('Comfort first', 'Confortul pe primul loc'),
        body: [
          text(
            'Your range is every pitch your voice can make. Your comfortable range is smaller: the part that feels easy, without pushing or squeezing.',
            'Registrul tău cuprinde toate înălțimile pe care le poate atinge vocea. Registrul comod e mai restrâns: partea care îți vine ușor, fără să împingi sau să strângi.',
          ),
          text(
            'In this lesson you will explore that comfortable part. Nothing needs to be loud, and nothing needs to be impressive.',
            'În această lecție vei explora tocmai această parte comodă. Nimic nu trebuie să fie tare și nimic nu trebuie să impresioneze.',
          ),
        ],
      },
      {
        id: 'sirens',
        type: 'practice',
        title: text('Gentle sirens', 'Sirene blânde'),
        body: [
          text(
            'On a soft “ooo”, slide slowly from a comfortable low note up to a comfortable high note and back down, like a distant siren. Do this three to five times.',
            'Pe un „uuu” ușor, alunecă lent de la o notă joasă comodă până la o notă înaltă comodă și înapoi, ca o sirenă îndepărtată. Repetă de trei până la cinci ori.',
          ),
          text(
            'Watch the trace draw a smooth hill. Bumps and breaks are completely normal; they tend to smooth out with practice.',
            'Urmărește cum linia desenează un deal lin. Denivelările și întreruperile sunt complet normale; de obicei se netezesc cu exercițiul.',
          ),
        ],
        tips: [
          text(
            'If your voice cracks or flips, that is okay. Keep the sound light and easy.',
            'Dacă vocea se frânge sau sare, e în regulă. Păstrează sunetul ușor și relaxat.',
          ),
          text(
            'Gently exploring your upper range now makes a slightly higher speaking pitch feel easier later.',
            'Explorarea blândă a registrului de sus face ca, mai târziu, o înălțime de vorbire puțin mai ridicată să vină mai ușor.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: true, showLevel: false, recording: { maxSeconds: 45 } },
      },
      {
        id: 'comfortable-edges',
        type: 'practice',
        title: text('Find your comfortable edges', 'Găsește-ți marginile comode'),
        body: [
          text(
            'Hum or sing “ah” and slowly step down until the sound starts to feel effortful. Step back up a little: that is your comfortable low. Then do the same going up to find your comfortable high.',
            'Fredonează sau cântă „aaa” și coboară încet până când sunetul începe să ceară efort. Urcă puțin înapoi: aceea este limita ta comodă de jos. Apoi fă la fel în sus ca să găsești limita comodă de sus.',
          ),
          text(
            'Record yourself, then look at the typical range in your results. If you like, save it as your practice band: an optional guide shown on pitch charts.',
            'Înregistrează-te, apoi uită-te la intervalul tipic din rezultate. Dacă vrei, salvează-l ca bandă de exercițiu: un ghid opțional afișat pe graficele de înălțime.',
          ),
        ],
        tips: [
          text(
            'Strain feels like squeezing, pushing or tightness in the throat. Comfort feels easy and free.',
            'Încordarea se simte ca o strângere, o împingere sau o tensiune în gât. Confortul se simte ușor și liber.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: true, showLevel: false, recording: { maxSeconds: 45 } },
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Your comfortable range can change from day to day, and it often grows with gentle practice.',
            'Registrul comod se poate schimba de la o zi la alta și deseori se lărgește cu exercițiu blând.',
          ),
        ],
        prompt: text(
          'Where in your range did your voice feel most at ease?',
          'În ce parte a registrului s-a simțit vocea ta cel mai relaxată?',
        ),
      },
    ],
  },
  {
    id: 'pitch-comfortable-center',
    area: 'pitch',
    minutes: 10,
    title: text('A comfortable centre', 'Un centru comod'),
    summary: text(
      'Find a comfortable speaking pitch and carry an easy hum into words.',
      'Găsește o înălțime de vorbire comodă și transformă o fredonare ușoară în cuvinte.',
    ),
    goals: [
      text('Hold a steady, easy note', 'Susține o notă stabilă și ușoară'),
      text('Explore speaking a little higher, without strain', 'Explorează vorbirea puțin mai sus, fără încordare'),
      text('Carry a hum into everyday words', 'Transformă fredonarea în cuvinte de zi cu zi'),
    ],
    steps: [
      {
        id: 'a-range-not-a-note',
        type: 'learn',
        title: text('A range, not a single note', 'Un interval, nu o singură notă'),
        body: [
          text(
            'Speech never sits on one note. When people talk about a speaking pitch, they mean a home area that the voice moves around.',
            'Vorbirea nu stă niciodată pe o singură notă. Când vorbim despre înălțimea vorbirii, ne referim la o zonă de bază în jurul căreia se mișcă vocea.',
          ),
          text(
            'Many trans women gently raise their home area. Research on women’s speech often cites a typical speaking pitch of about 165–255 Hz, and many trans women settle somewhere around 165–220 Hz. Voices overlap a lot, though, and resonance and weight matter more: aim for a pitch that feels comfortable, not as high as possible.',
            'Multe femei trans își ridică treptat zona de bază. Studiile despre vorbirea femeilor indică adesea o înălțime tipică de aproximativ 165–255 Hz, iar multe femei trans se stabilizează undeva în jur de 165–220 Hz. Totuși, vocile se suprapun mult, iar rezonanța și greutatea contează mai mult: caută o înălțime comodă, nu cât mai sus posibil.',
          ),
          text(
            'Some people keep their current pitch and focus on resonance and weight instead. That is a valid path too.',
            'Unele persoane își păstrează înălțimea actuală și se concentrează pe rezonanță și greutate. Și aceasta este o cale validă.',
          ),
        ],
      },
      {
        id: 'hold-and-hum',
        type: 'practice',
        title: text('Hold and hum', 'Susține și fredonează'),
        body: [
          text(
            'Hum a note that feels easy and hold it for about five seconds while watching the trace. Aim for a smooth, relaxed line rather than a perfectly flat one.',
            'Fredonează o notă care îți vine ușor și susține-o aproximativ cinci secunde, urmărind linia. Încearcă să o păstrezi lină și relaxată, nu perfect dreaptă.',
          ),
          text(
            'Then try a note a little higher. If it still feels easy, go one more small step up. When it starts to feel effortful, come back down to the last comfortable note.',
            'Apoi încearcă o notă puțin mai sus. Dacă încă îți vine ușor, mai urcă un pas mic. Când începe să ceară efort, revino la ultima notă comodă.',
          ),
        ],
        exercise: { kind: 'voice', showPitch: true, showLevel: false, showSteadiness: true, recording: null },
      },
      {
        id: 'hum-to-words',
        type: 'practice',
        title: text('From hum to words', 'De la fredonare la cuvinte'),
        body: [
          text(
            'Start with an “mm-hmm” on your chosen note, then say each line below, letting the words begin where the hum was.',
            'Începe cu un „mhm” pe nota aleasă, apoi spune fiecare rând de mai jos, lăsând cuvintele să pornească de unde a fost fredonarea.',
          ),
          text(
            'Record a few lines and listen back. Did it feel easy? Did it sound the way you would like?',
            'Înregistrează câteva rânduri și ascultă-le. A fost ușor? A sunat așa cum ți-ai dori?',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: true,
          recording: { maxSeconds: 60 },
          prompts: [
            text('Mm-hmm. Hi!', 'Mhm. Salut!'),
            text('Mm-hmm. Hello, how are you?', 'Mhm. Bună, ce mai faci?'),
            text('Mm-hmm. A coffee, please.', 'Mhm. O cafea, te rog.'),
            text('Mm-hmm. See you tomorrow!', 'Mhm. Ne vedem mâine!'),
          ],
        },
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'Your home area may shift over time as you explore. Let curiosity guide you rather than a number.',
            'Zona ta de bază se poate schimba în timp, pe măsură ce explorezi. Lasă-te ghidată de curiozitate, nu de un număr.',
          ),
        ],
        prompt: text(
          'Which pitch area felt most like you today?',
          'Ce zonă de înălțime ți s-a potrivit cel mai bine azi?',
        ),
      },
    ],
  },
];
