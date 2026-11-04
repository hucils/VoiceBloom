import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

import { ToastProvider } from '../components/ToastProvider';
import { HomePage } from '../features/home/HomePage';
import { DataProvider } from '../state/DataContext';
import { SettingsProvider } from '../state/SettingsContext';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';
import { UpdatePrompt } from './UpdatePrompt';

// Route-level code splitting; the service worker precaches every chunk for offline use.
const LessonsPage = lazy(() => import('../features/lessons/LessonsPage').then((m) => ({ default: m.LessonsPage })));
const LessonPage = lazy(() => import('../features/lessons/LessonPage').then((m) => ({ default: m.LessonPage })));
const PracticePage = lazy(() => import('../features/practice/PracticePage').then((m) => ({ default: m.PracticePage })));
const RecordingsPage = lazy(() =>
  import('../features/recordings/RecordingsPage').then((m) => ({ default: m.RecordingsPage })),
);
const JournalPage = lazy(() => import('../features/journal/JournalPage').then((m) => ({ default: m.JournalPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export function App() {
  return (
    <DataProvider>
      <SettingsProvider>
        <ToastProvider>
          <BrowserRouter>
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
          </BrowserRouter>
          <UpdatePrompt />
        </ToastProvider>
      </SettingsProvider>
    </DataProvider>
  );
}
