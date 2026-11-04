# VoiceBloom

A privacy-first, offline-first companion for gender-affirming voice training, made mostly for trans women and open to anyone exploring their voice. It offers guided lessons, live pitch feedback, on-device recording analysis and a private voice journal, in English and Romanian.

> VoiceBloom is an educational tool. It is not a medical device, does not diagnose or treat anything, and is not a replacement for a speech-language pathologist.

## Principles

- **Audio stays on the device.** There is no backend, no account and no analytics. Everything is processed in the browser and stored in IndexedDB. A production Content-Security-Policy (`connect-src 'self'`) makes it technically impossible for the app to send audio anywhere.
- **Nothing is kept without a choice.** A recording is only saved when the person presses **Keep recording**. Every recording can be deleted on its own, all at once, or together with everything else (**Settings → Erase everything**).
- **Measurements are information, not grades.** Pitch, range, melodic variation and resonance are shown descriptively. Gender is never inferred by default.
- **The femininity estimate is strictly opt-in.** It stays off until the person turns it on and confirms a disclosure dialog. It combines pitch *and* resonance (never pitch alone), is shown as a rough range with its two factors, and is computed on display and never stored. See [The femininity estimate](#the-femininity-estimate).
- **Calm by design.** Lavender and cream, soft gradients, rounded cards and readable type (Fraunces for headings, Inter for text). Gentle animation that respects `prefers-reduced-motion`. No streaks, points or badges.

## Features

| Area | What it does |
| --- | --- |
| Lessons | 12 guided lessons across foundations, pitch, resonance, vocal weight, intonation and articulation. Each has learn, practice and reflect steps; progress saves per step and resumes where you left off. |
| Voice studio | Live pitch readout with note names, a scrolling pitch trace with an optional practice band, an input-level meter, steadiness for held notes, and recording with an automatic time limit. |
| Analysis | Runs on the device in a Web Worker: pitch track (YIN), typical pitch and range, melodic variation, resonance (formant spacing) and waveform. |
| Recordings | Playback with a waveform scrubber and synced pitch contour, rename, save the audio file, delete. |
| Journal | Entries with how the voice felt, notes, and links to a lesson or recording; a daily writing prompt. |
| Settings | Language, theme (light, dark or match device), chart range, practice band, opt-in femininity estimate, persistent storage, backup export and import, erase everything. |
| Offline | Installable PWA; every asset is precached, so the whole app works without a network. |

## Getting started

Requirements: **Node.js 22.22 or later** (React Router 8 and Vitest 5 need it) and npm 11.

```bash
npm install
npm run dev          # http://localhost:5173
```

The microphone only works in a secure context, which means `https://` or `http://localhost`. To test on a phone, serve over HTTPS (for example `npx vite --host` behind a tunnel, or a local certificate).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload (no service worker, no CSP). |
| `npm run build` | Typecheck, then a production build in `dist/` (with service worker, generated icons and CSP). |
| `npm run preview` | Serve the production build locally; the closest thing to the real app. |
| `npm test` | Run the test suite once (`npm run test:watch` to watch). |
| `npm run lint` | ESLint, including the architecture guard described below. |
| `npm run typecheck` | TypeScript project build in check mode. |
| `npm run check` | Typecheck, lint and test together. |

### Deploying

`dist/` is a static site. Host it anywhere that serves HTTPS and falls back to `index.html` for unknown paths (needed for deep links such as `/lessons/pitch-explore-range` on the first visit; once installed, the service worker handles them offline). The CSP is set with a `<meta>` tag at build time. If your host can send headers, also send it as a `Content-Security-Policy` header and add `frame-ancestors 'none'`, which meta tags cannot express.

## Architecture

The code is split into layers with one-way dependencies. The core layers are plain TypeScript with no React, and an ESLint rule (`no-restricted-imports` in `eslint.config.js`) fails the build if `audio/`, `lessons/`, `persistence/` or `insights/` import React, UI libraries or UI modules.

```
┌──────────────────────────── UI ────────────────────────────┐
│  app/          shell, routing, theme, PWA prompt           │
│  features/     pages + feature components (voice, viz, …)  │
│  components/   design-system primitives                    │
│  state/        React glue: providers and live queries      │
└──────┬──────────────┬──────────────┬──────────────┬────────┘
       ▼              ▼              ▼              ▼
   audio/        lessons/      persistence/     insights/      i18n/
   signal        content as    IndexedDB        opt-in         typed
   processing    typed data    repositories     interpretation translations
```

```
src/
├── audio/          Signal processing. Pure modules: yin, pitchTrack, analysis, resonance (LPC),
│                   lpc, resample, level, waveform, stats, pitchMath. Browser adapters:
│                   microphone, live (LivePitchTracker), recorder (MediaRecorder),
│                   browserAudio (decode, worker, ClipPlayer), analysis.worker.
├── lessons/        Lesson content (content/*.ts), skill areas, catalog lookups,
│                   progress helpers, practice ideas. All text is { en, ro }.
├── persistence/    IndexedDB schema and migrations (db.ts), repositories for recordings,
│                   progress, journal and settings, backup export/import, validation,
│                   change notifications (also across tabs).
├── insights/       The opt-in femininity estimate.
├── i18n/           Typed translator, formatters (Hz, notes, dates, durations), message bundles.
├── state/          DataProvider (opens the database), SettingsProvider (theme + language),
│                   useLiveQuery hooks that re-run when data changes.
├── components/     Buttons, cards, dialogs, fields, switches, layout pieces.
├── features/       home, lessons, practice, recordings, journal, settings, onboarding,
│                   voice (studio, recorder session, player, insights), viz (charts).
├── app/            App, shell and navigation, boot screen, update prompt, theme, downloads.
└── test/           Test setup, synthetic signal generators, UI test harness.
```

### What happens when you record

1. **Start microphone.** `useVoiceSession` creates an `AudioContext` synchronously inside the click (Safari needs the user gesture), then asks for the microphone with echo cancellation, noise suppression and automatic gain turned **off**, because they distort pitch and level.
2. **Live feedback.** `LivePitchTracker` reads an `AnalyserNode` on every animation frame. `LiveAnalyzer` halves the sample rate, runs YIN, and smooths the result (a median of 3, plus holding back sudden leaps unless they persist). Charts subscribe to frames and draw on canvas without React re-renders.
3. **Record.** `VoiceRecorder` wraps `MediaRecorder`, preferring Opus (MP4/AAC on Safari). It stops automatically at the exercise's limit.
4. **Analyse.** The audio is decoded and resampled to 16 kHz mono with an `OfflineAudioContext`, then `analyzeSamples` runs in a Web Worker (falling back to the main thread if workers are unavailable).
5. **Review.** The draft plays back with Web Audio (`ClipPlayer`; WebM files from MediaRecorder lack a duration, so media elements cannot seek them reliably). Nothing is stored yet.
6. **Keep or discard.** **Keep** writes metadata plus analysis to `recordings` and the encoded audio to `recordingAudio`, in one transaction.

The microphone is released on unmount and when the tab goes to the background (unless a recording is in progress).

### Audio processing

**Pitch (YIN).** `audio/yin.ts` implements de Cheveigné & Kawahara (2002): difference function, cumulative mean normalisation, threshold and parabolic interpolation. There is one deliberate deviation. Textbook YIN takes the *first* dip below the threshold, which reads a 200 Hz voice as 600 Hz when a strong first formant sits on the third harmonic, as is common in higher voices. VoiceBloom uses the threshold only to decide voicing, then takes the earliest dip that is nearly as deep as the deepest one. Regression tests cover these cases.

**Pitch track clean-up** (`pitchTrack.ts`), in order:

1. An adaptive silence gate: 35 dB below the loudest frame, so quiet microphones still work.
2. Outlier removal: a frame more than 5 semitones from its ±100 ms neighbourhood is dropped. At the end of a phrase the window straddles voice and silence and can lock onto a ringing formant; this removes those spikes, while sirens and fast intonation move far less than that in 100 ms.
3. Short voiced runs are dropped.
4. A 5-frame median smooths what remains.

**Resonance** (`resonance.ts`). The signal is decimated to about 8 kHz and voiced frames get pre-emphasis and a Hamming window. LPC (Levinson–Durbin, order 10) is followed by polynomial roots (Durand–Kerner), giving formant candidates with bandwidths. F1–F3 are picked with plausibility checks, skipping a pole locked onto the fundamental. They are summarised as the uniform-tube **formant spacing** ΔF = (0.5·F1 + 1.5·F2 + 2.5·F3) / 8.75; a larger ΔF means a shorter, brighter-sounding vocal tract. This is shown as a neutral measurement on every recording.

**Performance** (Apple silicon, Node): offline analysis of 60 s of audio, including resonance, takes about 0.35 s in the worker. Live analysis of a 2048-sample frame at 48 kHz (level, halving the sample rate, YIN, smoothing) costs about 0.4 ms, a few percent of one core at 60 frames per second.

**Verified end to end** in a headless Chromium-based browser (Brave) with a fake microphone playing a synthetic voice at a known pitch (190–214 Hz glide, formant spacing 1,164 Hz). The app reported a typical range of 191–214 Hz and a spacing of 1,168 Hz after real Opus encoding and decoding, with no console errors or CSP violations, and worked offline.

### The femininity estimate

`insights/femininity.ts`, used only when `settings.showFemininityEstimate` is true.

- **Inputs:** the recording's median pitch and formant spacing.
- **Model:** each input is placed on a logistic curve centred between published adult averages. Pitch is centred at 160 Hz, with averages of about 120 Hz for men and 210 Hz for women (Baken & Orlikoff 2000; Titze 1994). Formant spacing is centred at 1,085 Hz, with about 1,000 Hz for men and 1,170 Hz for women, derived from Hillenbrand et al. 1995. The two are averaged with equal weight, since both contribute to perceived speaker gender (Hillenbrand & Clark 2009).
- **Output:** a 0–100 score, a likely range (wider for short recordings), the score for each factor on its own, and a low-confidence flag. Formant tracking is less reliable for higher voices and short clips.
- **Honesty:** the constants are hand-set from those reference points, not fitted to listener judgements, and the research is mostly on cisgender English speakers. The UI says so, and the estimate declines to answer without enough speech or resonance data.
- **Opt-in:** the setting defaults to off, the storage layer only accepts an explicit `true`, and a disclosure dialog must be confirmed. The estimate is computed on display, never stored, and never shown in lessons.

*Decision record:* the original specification said to never infer gender from voice measurements and never present pitch as a femininity score. On 2026-11-04 the project owner asked for an optional femininity score and chose this opt-in, pitch-plus-resonance design. A pitch-only score was considered and rejected as inaccurate. Lessons and default views remain free of gender inference.

### Persistence

IndexedDB through [`idb`](https://github.com/jakearchibald/idb). The schema lives in `persistence/db.ts` (version 1). Add a numbered block to `upgrade()` for each new version.

| Store | Key | Contents |
| --- | --- | --- |
| `recordings` | `id` | Metadata and analysis (small, so listing never loads audio). Index `by-created`. |
| `recordingAudio` | `id` | Encoded audio as an `ArrayBuffer` plus MIME type. |
| `progress` | `lessonId` | Completed steps, current step, start and completion times. |
| `journal` | `id` | Feeling, notes and optional lesson or recording link. Indexes `by-created`, `by-recording`. |
| `settings` | `'app'` | One settings object. |

- **Integrity:** deleting a recording unlinks journal entries that pointed to it, in the same transaction.
- **Settings updates** are atomic read-modify-write transactions, so concurrent changes never overwrite each other.
- **Validation:** everything read back or imported passes through `persistence/validation.ts`, so a corrupted or hand-edited backup cannot write bad data.
- **Change notifications:** repositories notify subscribers after each write, and a `BroadcastChannel` keeps open tabs in sync.

**Backups** are JSON files (`format: "voicebloom-backup"`, `version: 1`) with settings, progress, journal and, optionally, recordings as base64. Import merges by ID in a single transaction and reports how many damaged items it skipped.

### Internationalisation

The English bundle (`i18n/messages/en.ts`) defines the shape and `ro.ts` is typed against it, so a missing or extra key is a compile error. `t()` keys are checked too. Plurals use `Intl.PluralRules`; Romanian needs three forms, `one` / `few` / `other`, as in "1 înregistrare / 3 înregistrări / 20 de înregistrări". Lesson content uses `{ en, ro }` pairs, so a missing translation is also a type error.

Romanian conventions (enforced by tests in `i18n/messages.test.ts` and `lessons/lessons.test.ts`):

- **Address the reader in the feminine** ("când ești pregătită", "fii blândă cu tine", "tu însăți"). A test flags masculine forms after verbs addressed to the reader.
- **Use comma-below ș and ț,** never the cedilla look-alikes ş and ţ.
- **Name notes in fixed-do solfège** (Do, Re, Mi …).

English addresses the reader as "you"; example sentences and passages use she/her.

To add a language, add its code to `Locale` in `i18n/locales.ts`. TypeScript then lists every bundle and lesson string that needs a translation.

### Lesson content

Lessons are data in `lessons/content/*.ts`; the order in `lessons/catalog.ts` is the recommended path. Each step is `learn`, `practice` (optionally with a `voice` or `breathing` exercise) or `reflect` (with a journal prompt). Lesson and step IDs are stored in progress records, so treat them as permanent once released. Tests check unique and storable IDs, complete translations, sensible exercise limits, and that every lesson has a practice step and ends with a reflection.

### Design system

Colours are semantic CSS tokens in `src/index.css` (`--vb-*`), switched for the dark "dusk" theme by a `.dark` class on `<html>` (`app/theme.ts` follows the OS unless a theme is chosen). Tailwind v4 exposes them as utilities (`bg-surface`, `text-ink-muted`, `bg-accent` …). Chart colours were validated for colour-vision deficiency, lightness, chroma and contrast in both themes, so the pitch trace and playhead stay distinguishable for colour-blind people.

### Accessibility

- Semantic landmarks, a skip link, and focus moved to the new content on navigation and between lesson steps.
- Native `<dialog>` for confirmations; switches, radios and sliders with proper roles.
- Keyboard scrubbing on the waveform (arrows, Page Up/Down, Home, End).
- Charts carry text summaries, and every value shown on hover is also in the stat tiles.
- Status is never conveyed by colour alone; motion is reduced when the OS asks.

## Testing

```bash
npm test
```

174 tests across 14 files:

- **Audio:** YIN accuracy across sample rates, harmonic-rich tones, formant-on-harmonic cases, noise and silence. Pitch clean-up, including the phrase-end formant spikes, with a test verified to fail without the fix. Analysis of glides, pauses and quiet input. Formant recovery from synthetic vowels, decimation, LPC and polynomial roots. Live smoothing, steadiness, microphone error mapping and recording formats.
- **Insights:** the estimate's monotonicity and bounds, that pitch alone cannot carry it, uncertainty, and declining without data.
- **Persistence** (fake-indexeddb): CRUD, cascading unlinks, idempotent progress, concurrent settings updates, sanitising corrupted data, and backup round-trips and rejection.
- **i18n and content:** bundle parity, placeholders, Romanian plurals, diacritics and feminine address; lesson catalog integrity.
- **UI** (Testing Library, against real repositories): onboarding in Romanian; lesson progress, resume and completion; the estimate's opt-in dialog and its appearance on recordings; deleting with confirmation; journal entries; a blocked microphone; language switching.

Synthetic test signals (sines, voice-like harmonic tones, glides, Klatt-style vowels with known formants, seeded noise) live in `src/test/signals.ts`.

## Roadmap

**Next**
- Playwright end-to-end tests in CI, using Chromium's fake microphone with a known WAV, as already done manually during development.
- Compare two recordings side by side (for example the baseline and today), with overlaid pitch contours.
- A gentle practice history: minutes and sessions per week, with no streaks.
- Live resonance (formant spacing) feedback during the resonance lessons.

**Later**
- Move live analysis into an `AudioWorklet` for steadier timing on low-end phones.
- A "form of address" setting (feminine, masculine or neutral Romanian) for people outside the main audience.
- More lessons: breath support, volume and projection, phone-call practice, and longer reading passages.
- An optional end-to-end encrypted sync, opt-in only, with explicit consent for any upload. It must never be the default, and the CSP would need a deliberate, documented change.
- Calibrating the femininity estimate against listener ratings, ideally including trans speakers and Romanian voices, and publishing the method.

**Known limitations**
- Formant tracking is approximate. It is less reliable for high voices, whispering, humming, noisy rooms and phone microphones.
- iOS mutes Web Audio when the ring switch is silent. VoiceBloom requests a playback audio session (Safari 16.4+); older iOS versions may stay silent.
- Data lives in one browser profile. Clearing site data removes it, so request persistent storage and export backups.

## Licences

Fonts: Inter and Fraunces (SIL Open Font License) via Fontsource. Icons: Lucide (ISC). Everything runs locally and nothing is loaded from third-party servers.
