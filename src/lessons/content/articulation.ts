import { text, type Lesson } from '../types';

export const articulationLessons: readonly Lesson[] = [
  {
    id: 'articulation-precise',
    area: 'articulation',
    minutes: 8,
    title: text('Light, precise consonants', 'Consoane ușoare și precise'),
    summary: text(
      'Shape sounds with the tip of your tongue for clear, nimble speech.',
      'Modelează sunetele cu vârful limbii pentru o vorbire clară și sprintenă.',
    ),
    goals: [
      text('Understand articulation', 'Înțelege articulația'),
      text('Warm up the tongue and lips', 'Încălzește limba și buzele'),
      text('Practise tongue twisters slowly, then faster', 'Exersează frământări de limbă încet, apoi mai repede'),
    ],
    steps: [
      {
        id: 'shaping-sounds',
        type: 'learn',
        title: text('Shaping sounds', 'Modelarea sunetelor'),
        body: [
          text(
            'Articulation is how you shape vowels and consonants with your lips, teeth and tongue. It affects clarity, rhythm and the overall impression a voice makes.',
            'Articulația este felul în care modelezi vocalele și consoanele cu buzele, dinții și limba. Ea influențează claritatea, ritmul și impresia generală pe care o lasă o voce.',
          ),
          text(
            'Lighter, more precise consonants made with the tip of the tongue tend to sound crisp and forward; softer, broader ones sound more relaxed. Many trans women find that light, forward articulation pairs well with brighter resonance. These are styles, not rules.',
            'Consoanele mai ușoare și mai precise, făcute cu vârful limbii, sună de obicei clar și „în față”; cele mai moi și mai largi sună mai relaxat. Multe femei trans descoperă că o articulație ușoară și „în față” se potrivește bine cu o rezonanță mai luminoasă. Acestea sunt stiluri, nu reguli.',
          ),
        ],
      },
      {
        id: 'lips-and-tongue',
        type: 'practice',
        title: text('Lips and tongue warm-up', 'Încălzirea buzelor și a limbii'),
        body: [
          text(
            'Say “puh-tuh-kuh” slowly ten times, then a little faster. Feel the lips, the tongue tip and the back of the tongue take turns.',
            'Spune „pa-ta-ca” încet de zece ori, apoi puțin mai repede. Simte cum buzele, vârful limbii și partea din spate a limbii lucrează pe rând.',
          ),
          text(
            'Then trace slow circles with your tongue behind your lips, five in each direction.',
            'Apoi desenează cercuri lente cu limba în spatele buzelor, câte cinci în fiecare direcție.',
          ),
        ],
      },
      {
        id: 'tongue-twisters',
        type: 'practice',
        title: text('Tongue twisters', 'Frământări de limbă'),
        body: [
          text(
            'Read each line slowly and precisely, then a little faster. Keep the consonants light: think “tapping”, not “pushing”.',
            'Citește fiecare rând încet și precis, apoi puțin mai repede. Păstrează consoanele ușoare: gândește-te la „atingeri”, nu la „împingeri”.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: false,
          showLevel: true,
          recording: { maxSeconds: 45 },
          prompts: [
            text('She sells seashells by the seashore.', 'Șase sași în șase saci.'),
            text('Red leather, yellow leather.', 'Capra calcă piatra, piatra crapă-n patru.'),
            text(
              'Unique New York, you know you need unique New York.',
              'Un vultur stă pe pisc cu un pix în plisc.',
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
            'Clear articulation often feels like less effort, not more. Notice where your tongue likes to work.',
            'O articulație clară cere adesea mai puțin efort, nu mai mult. Observă unde preferă limba să lucreze.',
          ),
        ],
        prompt: text(
          'Which sounds were easiest? Which would you like to practise more?',
          'Ce sunete ți-au ieșit cel mai ușor? Pe care ai vrea să le exersezi mai mult?',
        ),
      },
    ],
  },
  {
    id: 'articulation-together',
    area: 'articulation',
    minutes: 12,
    title: text('Bringing it together', 'Totul la un loc'),
    summary: text(
      'Combine everything you have explored in a short reading, and look back at how far you have come.',
      'Combină tot ce ai explorat într-o lectură scurtă și privește cât drum ai parcurs.',
    ),
    goals: [
      text(
        'Combine pitch, resonance, weight, intonation and articulation',
        'Îmbină înălțimea, rezonanța, greutatea, intonația și articulația',
      ),
      text('Record a short passage', 'Înregistrează un scurt fragment'),
      text('Compare it with your baseline', 'Compară-l cu punctul de plecare'),
    ],
    steps: [
      {
        id: 'one-thing-at-a-time',
        type: 'learn',
        title: text('One thing at a time', 'Câte un lucru pe rând'),
        body: [
          text(
            'Juggling everything at once is hard, and it is normal for your voice to drift back to old habits, especially when you are tired or focused on what you are saying.',
            'E greu să jonglezi cu toate deodată și e normal ca vocea să revină la vechile obiceiuri, mai ales când ești obosită sau concentrată pe ce spui.',
          ),
          text(
            'Pick one or two qualities to focus on while you read. Over time, the others become more automatic.',
            'Alege una sau două calități pe care să te concentrezi în timp ce citești. Cu timpul, celelalte devin mai automate.',
          ),
        ],
      },
      {
        id: 'read-a-passage',
        type: 'practice',
        title: text('Read a short passage', 'Citește un scurt fragment'),
        body: [
          text(
            'Read the passage at an unhurried pace, keeping one or two of your chosen qualities in mind. Record it when you are ready.',
            'Citește fragmentul fără grabă, având în minte una sau două dintre calitățile alese. Înregistrează-l când ești pregătită.',
          ),
        ],
        exercise: {
          kind: 'voice',
          showPitch: true,
          showLevel: true,
          recording: { maxSeconds: 90, suggestedTitle: text('Reading passage', 'Fragment citit') },
          prompts: [
            text(
              'Every morning, Ana opens the little bakery on the corner, and the street fills with the smell of warm bread. She greets her neighbours by name as they stop on their way to work, and they leave with something sweet. Some days it rains and some days the sun is bright, but her door is always open and her coffee is always hot.',
              'În fiecare dimineață, Ana deschide mica brutărie din colț, iar strada se umple de miros de pâine caldă. Își salută vecinii pe nume când se opresc în drum spre serviciu, iar ei pleacă cu ceva dulce. În unele zile plouă, în altele soarele strălucește, dar ușa ei e mereu deschisă și cafeaua ei e mereu fierbinte.',
            ),
          ],
        },
      },
      {
        id: 'look-back',
        type: 'learn',
        title: text('Look back', 'Privește înapoi'),
        body: [
          text(
            'Open Recordings and listen to your baseline from the first pitch lesson, then to today’s reading. Notice what has changed, and what you would like to keep exploring.',
            'Deschide Înregistrări și ascultă punctul de plecare din prima lecție despre înălțime, apoi lectura de azi. Observă ce s-a schimbat și ce ai vrea să explorezi în continuare.',
          ),
          text(
            'Progress in voice training is rarely a straight line. Coming back, again and again, is what makes the difference.',
            'Progresul în antrenarea vocii rareori urmează o linie dreaptă. Diferența o face revenirea, iar și iar.',
          ),
        ],
      },
      {
        id: 'reflect',
        type: 'reflect',
        title: text('Reflect', 'Reflecție'),
        body: [
          text(
            'You can return to any lesson at any time. Each visit is a chance to notice something new.',
            'Poți reveni oricând la orice lecție. Fiecare revenire este o ocazie de a observa ceva nou.',
          ),
        ],
        prompt: text(
          'What are you proud of in your voice journey so far?',
          'Cu ce ești mândră în călătoria ta vocală de până acum?',
        ),
      },
    ],
  },
];
