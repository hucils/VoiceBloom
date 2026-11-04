import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLesson } from '../lessons/catalog';
import { renderApp, setupRepositories, SPEECH_ANALYSIS } from '../test/renderApp';

const audio = () => new Uint8Array([1, 2, 3, 4]).buffer;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('first run', () => {
  it('walks through the welcome guide, in Romanian when chosen', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories();
    renderApp(repos);

    expect(await screen.findByRole('heading', { name: 'Welcome to VoiceBloom' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Română' }));
    expect(await screen.findByRole('heading', { name: 'Bine ai venit în VoiceBloom' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ro');

    for (let step = 0; step < 3; step++) await user.click(screen.getByRole('button', { name: 'Înainte' }));
    expect(screen.getByRole('heading', { name: 'Informație, nu judecată' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Să începem' }));

    expect(await screen.findByText('Ce ai vrea să explorezi azi?')).toBeInTheDocument();
    expect(await repos.settings.load()).toMatchObject({ locale: 'ro', onboardingCompleted: true });
  });
});

describe('lessons', () => {
  const lesson = getLesson('intonation-melody')!;

  it('saves progress step by step and marks the lesson complete', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true });
    renderApp(repos, `/lessons/${lesson.id}`);

    expect(await screen.findByRole('heading', { level: 1, name: lesson.title.en })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('heading', { level: 2, name: lesson.steps[1]!.title.en })).toBeInTheDocument();
    expect((await repos.progress.get(lesson.id))?.completedStepIds).toEqual([lesson.steps[0]!.id]);

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(await screen.findByRole('button', { name: 'Finish lesson' }));

    expect(await screen.findByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    expect((await repos.progress.get(lesson.id))?.completedAt).toEqual(expect.any(Number));
  });

  it('reopens a lesson at the step where it was left', async () => {
    const repos = await setupRepositories({ onboardingCompleted: true });
    await repos.progress.setCurrentStep(lesson.id, lesson.steps[2]!.id);
    renderApp(repos, `/lessons/${lesson.id}`);
    expect(await screen.findByRole('heading', { level: 2, name: lesson.steps[2]!.title.en })).toBeInTheDocument();
  });

  it('shows status in the lesson library', async () => {
    const repos = await setupRepositories({ onboardingCompleted: true });
    await repos.progress.completeLesson(lesson.id);
    renderApp(repos, '/lessons');
    const card = (await screen.findByRole('heading', { name: lesson.title.en })).closest('a')!;
    expect(await within(card).findByText('Completed')).toBeInTheDocument();
    expect(within(card).queryByText('Not started')).toBeNull();
  });
});

describe('femininity estimate (opt-in)', () => {
  it('stays off until confirmed in a disclosure dialog', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true });
    renderApp(repos, '/settings');

    const toggle = await screen.findByRole('switch', { name: 'Show the femininity estimate' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    const dialog = await screen.findByRole('dialog', { name: 'Turn on the femininity estimate?' });
    expect(within(dialog).getByText(/says nothing about your gender/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep it off' }));
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect((await repos.settings.load()).showFemininityEstimate).toBe(false);

    await user.click(toggle);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Turn on' }));
    await waitFor(async () => expect((await repos.settings.load()).showFemininityEstimate).toBe(true));
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('appears on recordings only once turned on', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true });
    await repos.recordings.add({ audio: audio(), mimeType: 'audio/webm', durationMs: 8000, analysis: SPEECH_ANALYSIS, title: 'Reading' });
    renderApp(repos, '/recordings');

    await user.click(await screen.findByRole('button', { name: 'Show details' }));
    expect(screen.getByText('Typical pitch')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Femininity estimate' })).not.toBeInTheDocument();

    await repos.settings.update({ showFemininityEstimate: true });
    expect(await screen.findByRole('heading', { name: 'Femininity estimate' })).toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Femininity estimate \d+ out of 100/ })).toBeInTheDocument();
  });

  it('shows each part on its own, and what made it sound less natural', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true, showFemininityEstimate: true });
    // SPEECH_ANALYSIS has a very steady melody (0.7 semitones of variation).
    await repos.recordings.add({ audio: audio(), mimeType: 'audio/webm', durationMs: 8000, analysis: SPEECH_ANALYSIS });
    renderApp(repos, '/recordings');

    await user.click(await screen.findByRole('button', { name: 'Show details' }));
    const card = (await screen.findByRole('heading', { name: 'Femininity estimate' })).closest('section')!;
    for (const part of ['Pitch', 'Resonance', 'Vocal weight', 'Intonation']) {
      expect(within(card).getByRole('img', { name: new RegExp(`^${part} on its own: \\d+$`) })).toBeInTheDocument();
    }
    expect(within(card).getByRole('img', { name: /^How natural it sounds: \d+ out of 100\.$/ })).toBeInTheDocument();
    expect(within(card).getByText(/barely moves/)).toBeInTheDocument();
  });

  it('explains that recordings analysed before this update have no vocal weight', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true, showFemininityEstimate: true });
    await repos.recordings.add({
      audio: audio(),
      mimeType: 'audio/webm',
      durationMs: 8000,
      analysis: { ...SPEECH_ANALYSIS, version: 1, voice: null },
    });
    renderApp(repos, '/recordings');

    await user.click(await screen.findByRole('button', { name: 'Show details' }));
    expect(await screen.findByText(/analysed before VoiceBloom measured vocal weight/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Femininity estimate \d+ out of 100/ })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /^Vocal weight on its own/ })).not.toBeInTheDocument();
  });

  it('does not estimate held notes or sirens', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true, showFemininityEstimate: true });
    const heldNote = { ...SPEECH_ANALYSIS, pitch: SPEECH_ANALYSIS.pitch.map(() => 200) };
    await repos.recordings.add({ audio: audio(), mimeType: 'audio/webm', durationMs: 8000, analysis: heldNote });
    renderApp(repos, '/recordings');

    await user.click(await screen.findByRole('button', { name: 'Show details' }));
    expect(await screen.findByText(/held notes or sirens rather than speech/)).toBeInTheDocument();
    expect(screen.queryByText('out of 100')).not.toBeInTheDocument();
  });
});

describe('recordings', () => {
  it('deletes a recording only after confirmation', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true });
    await repos.recordings.add({ audio: audio(), mimeType: 'audio/webm', durationMs: 4000, analysis: SPEECH_ANALYSIS });
    renderApp(repos, '/recordings');

    await user.click(await screen.findByRole('button', { name: 'Show details' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this recording?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/Your recordings will appear here/)).toBeInTheDocument();
    expect(await repos.recordings.list()).toEqual([]);
  });
});

describe('journal', () => {
  it('adds an entry with a feeling and notes', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true });
    renderApp(repos, '/journal');

    await user.click((await screen.findAllByRole('button', { name: 'New entry' }))[0]!);
    await user.click(screen.getByRole('button', { name: 'At ease' }));
    await user.type(screen.getByLabelText('Your notes'), 'Light and easy today.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Light and easy today.')).toBeInTheDocument();
    expect((await repos.journal.list())[0]).toMatchObject({ feeling: 'easy', body: 'Light and easy today.' });
  });
});

describe('microphone', () => {
  it('explains how to recover when access is blocked', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        resume = () => Promise.resolve();
        close = () => Promise.resolve();
      },
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      languages: ['en-US'],
      mediaDevices: { getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) },
    });
    const repos = await setupRepositories({ onboardingCompleted: true });
    renderApp(repos, '/practice');

    expect(await screen.findByText(/Nothing is saved unless you choose/)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Start microphone' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Microphone access was blocked');
  });
});

describe('settings', () => {
  it('switches the interface language', async () => {
    const user = userEvent.setup();
    const repos = await setupRepositories({ onboardingCompleted: true });
    renderApp(repos, '/settings');
    await user.click(await screen.findByRole('radio', { name: 'Română' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Setări' })).toBeInTheDocument();
    expect((await repos.settings.load()).locale).toBe('ro');
  });
});
