import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { ANALYSIS_VERSION, type RecordingAnalysis } from '../audio/analysis';
import { AppShell } from '../app/AppShell';
import { NotFoundPage } from '../app/NotFoundPage';
import { ToastProvider } from '../components/ToastProvider';
import { HomePage } from '../features/home/HomePage';
import { JournalPage } from '../features/journal/JournalPage';
import { LessonPage } from '../features/lessons/LessonPage';
import { LessonsPage } from '../features/lessons/LessonsPage';
import { PracticePage } from '../features/practice/PracticePage';
import { RecordingsPage } from '../features/recordings/RecordingsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { createRepositories, DEFAULT_SETTINGS, openVoiceBloomDB, type AppSettings } from '../persistence';
import { DataProvider } from '../state/DataContext';
import { SettingsProvider } from '../state/SettingsContext';

/** Real repositories over a fresh fake-indexeddb database. */
export async function setupRepositories(settings?: Partial<AppSettings>) {
  const db = await openVoiceBloomDB(`ui-${crypto.randomUUID()}`);
  const repos = createRepositories(db);
  if (settings) await repos.settings.save({ ...DEFAULT_SETTINGS, ...settings });
  return repos;
}

/** The whole app (minus the service worker prompt) at `route`, with every route eager. */
export function renderApp(repos: Awaited<ReturnType<typeof setupRepositories>>, route = '/') {
  return render(
    <DataProvider repositories={repos}>
      <SettingsProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="lessons" element={<LessonsPage />} />
                <Route path="lessons/:lessonId" element={<LessonPage />} />
                <Route path="practice" element={<PracticePage />} />
                <Route path="recordings" element={<RecordingsPage />} />
                <Route path="journal" element={<JournalPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </SettingsProvider>
    </DataProvider>,
  );
}

/** Analysis of a few seconds of speech, as the pipeline would store it. */
export const SPEECH_ANALYSIS: RecordingAnalysis = {
  version: ANALYSIS_VERSION,
  durationSec: 8,
  hopSeconds: 0.02,
  firstFrameSec: 0.0167,
  pitch: Array.from({ length: 400 }, (_, i) => (i % 25 < 20 ? 175 + 10 * Math.sin(i / 15) : null)),
  peaks: Array.from({ length: 240 }, (_, i) => 0.2 + 0.3 * Math.abs(Math.sin(i / 7))),
  summary: {
    medianHz: 176,
    lowHz: 166,
    highHz: 185,
    rangeSemitones: 1.9,
    variationSemitones: 0.7,
    voicedSeconds: 6.4,
    voicedRatio: 0.8,
  },
  resonance: { formantSpacingHz: 1120, f1Hz: 560, f2Hz: 1680, f3Hz: 2800, frames: 220 },
};
