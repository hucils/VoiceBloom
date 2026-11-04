// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ANALYSIS_VERSION, type RecordingAnalysis } from '../audio/analysis';
import { BackupError, parseBackup } from './backup';
import { openVoiceBloomDB, type VoiceBloomDB } from './db';
import { createRepositories, DEFAULT_SETTINGS, type Repositories } from './index';

let db: VoiceBloomDB;
let repos: Repositories;

const analysis: RecordingAnalysis = {
  version: ANALYSIS_VERSION,
  durationSec: 1,
  hopSeconds: 0.02,
  firstFrameSec: 0.0167,
  pitch: [180, 181.5, null, 179],
  peaks: [0.1, 0.5, 0.2],
  summary: {
    medianHz: 180,
    lowHz: 179.2,
    highHz: 181.1,
    rangeSemitones: 0.2,
    variationSemitones: 0.1,
    voicedSeconds: 0.06,
    voicedRatio: 0.75,
  },
  resonance: { formantSpacingHz: 1110, f1Hz: 560, f2Hz: 1660, f3Hz: 2780, frames: 42 },
  voice: { h1h2Db: 5.4, frames: 40 },
};

const audioBytes = (...values: number[]) => new Uint8Array(values).buffer;

async function addRecording(title = '', createdAt = Date.now()) {
  return repos.recordings.add(
    { audio: audioBytes(1, 2, 3, 4), mimeType: 'audio/webm', durationMs: 1000, analysis, title },
    createdAt,
  );
}

beforeEach(async () => {
  db = await openVoiceBloomDB(`test-${crypto.randomUUID()}`);
  repos = createRepositories(db);
});

afterEach(() => {
  db.close();
});

describe('recordings', () => {
  it('stores metadata and audio separately and lists newest first', async () => {
    const first = await addRecording('First', 1000);
    const second = await addRecording('Second', 2000);

    const list = await repos.recordings.list();
    expect(list.map((r) => r.id)).toEqual([second.id, first.id]);
    expect(list[0]).not.toHaveProperty('data');
    expect(first.sizeBytes).toBe(4);

    const audio = await repos.recordings.getAudio(first.id);
    expect(new Uint8Array(audio!.data)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(audio!.mimeType).toBe('audio/webm');
  });

  it('renames, trimming and limiting the title', async () => {
    const recording = await addRecording();
    await repos.recordings.rename(recording.id, `  ${'a'.repeat(200)}  `);
    expect((await repos.recordings.get(recording.id))!.title).toHaveLength(120);
  });

  it('reads recordings saved before vocal weight was measured as "not measured"', async () => {
    const { voice: _omitted, ...versionOne } = { ...analysis, version: 1 as const };
    await db.put('recordings', {
      id: 'saved-earlier',
      createdAt: 5,
      durationMs: 1000,
      mimeType: 'audio/webm',
      sizeBytes: 4,
      title: '',
      lessonId: null,
      stepId: null,
      analysis: versionOne as RecordingAnalysis,
    });

    const [listed] = await repos.recordings.list();
    expect(listed?.analysis).toMatchObject({ version: 1, voice: null, resonance: analysis.resonance });
    expect((await repos.recordings.get('saved-earlier'))?.analysis?.voice).toBeNull();
    expect((await addRecording()).analysis?.voice).toEqual(analysis.voice);
  });

  it('deletes audio and analysis, and unlinks journal entries that referenced it', async () => {
    const recording = await addRecording();
    const entry = await repos.journal.create({ feeling: 'easy', body: 'Nice', recordingId: recording.id });

    await repos.recordings.remove(recording.id);

    expect(await repos.recordings.get(recording.id)).toBeUndefined();
    expect(await repos.recordings.getAudio(recording.id)).toBeUndefined();
    const kept = await repos.journal.get(entry.id);
    expect(kept?.body).toBe('Nice');
    expect(kept?.recordingId).toBeNull();
  });

  it('deletes all recordings at once', async () => {
    const recording = await addRecording();
    await addRecording();
    const entry = await repos.journal.create({ feeling: null, body: 'x', recordingId: recording.id });

    await repos.recordings.removeAll();

    expect(await repos.recordings.list()).toEqual([]);
    expect(await repos.recordings.usage()).toEqual({ count: 0, bytes: 0 });
    expect((await repos.journal.get(entry.id))?.recordingId).toBeNull();
  });

  it('reports storage usage', async () => {
    await addRecording();
    await addRecording();
    expect(await repos.recordings.usage()).toEqual({ count: 2, bytes: 8 });
  });

  it('notifies subscribers after changes', async () => {
    const listener = vi.fn();
    repos.notifier.subscribe('recordings', listener);
    const recording = await addRecording();
    await repos.recordings.remove(recording.id);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('lesson progress', () => {
  it('creates progress on first use and records completed steps once', async () => {
    await repos.progress.setCurrentStep('lesson-a', 'intro', 100);
    await repos.progress.completeStep('lesson-a', 'intro', 'practice', 200);
    await repos.progress.completeStep('lesson-a', 'intro', 'practice', 300);

    const progress = await repos.progress.get('lesson-a');
    expect(progress).toMatchObject({
      completedStepIds: ['intro'],
      currentStepId: 'practice',
      startedAt: 100,
      updatedAt: 300,
      completedAt: null,
    });
  });

  it('keeps the first completion time when a lesson is repeated', async () => {
    await repos.progress.completeLesson('lesson-a', 1000);
    await repos.progress.completeLesson('lesson-a', 5000);
    expect((await repos.progress.get('lesson-a'))?.completedAt).toBe(1000);
  });

  it('can reset a lesson', async () => {
    await repos.progress.completeLesson('lesson-a');
    await repos.progress.reset('lesson-a');
    expect(await repos.progress.get('lesson-a')).toBeUndefined();
  });
});

describe('journal', () => {
  it('creates, updates and deletes entries', async () => {
    const entry = await repos.journal.create({ feeling: 'tired', body: 'Long day', lessonId: 'pitch-1' }, 1000);
    const updated = await repos.journal.update(entry.id, { body: 'Long day, but it went well', feeling: 'okay' }, 2000);

    expect(updated).toMatchObject({ createdAt: 1000, updatedAt: 2000, feeling: 'okay', lessonId: 'pitch-1' });

    await repos.journal.remove(entry.id);
    expect(await repos.journal.list()).toEqual([]);
  });

  it('lists newest first', async () => {
    const older = await repos.journal.create({ feeling: null, body: 'a' }, 1000);
    const newer = await repos.journal.create({ feeling: null, body: 'b' }, 2000);
    expect((await repos.journal.list()).map((e) => e.id)).toEqual([newer.id, older.id]);
  });

  it('returns undefined when updating a missing entry', async () => {
    expect(await repos.journal.update('missing', { body: 'x' })).toBeUndefined();
  });
});

describe('settings', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await repos.settings.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const custom = { ...DEFAULT_SETTINGS, locale: 'ro' as const, practiceBand: { low: 150, high: 220 } };
    await repos.settings.save(custom);
    expect(await repos.settings.load()).toEqual(custom);
  });

  it('merges concurrent partial updates without losing any of them', async () => {
    await Promise.all([
      repos.settings.update({ theme: 'dark' }),
      repos.settings.update({ showNoteNames: false }),
      repos.settings.update({ locale: 'ro' }),
    ]);
    expect(await repos.settings.load()).toMatchObject({ theme: 'dark', showNoteNames: false, locale: 'ro' });
  });

  it('keeps the femininity estimate off unless it was explicitly turned on', async () => {
    expect(DEFAULT_SETTINGS.showFemininityEstimate).toBe(false);
    await db.put('settings', { ...DEFAULT_SETTINGS, showFemininityEstimate: 'yes' } as never, 'app');
    expect((await repos.settings.load()).showFemininityEstimate).toBe(false);
    await repos.settings.save({ ...DEFAULT_SETTINGS, showFemininityEstimate: true });
    expect((await repos.settings.load()).showFemininityEstimate).toBe(true);
  });

  it('repairs invalid stored values field by field', async () => {
    await db.put(
      'settings',
      { locale: 'fr', theme: 'neon', chartRange: { low: 400, high: 100 }, showNoteNames: false } as never,
      'app',
    );
    const loaded = await repos.settings.load();
    expect(loaded.locale).toBe('en');
    expect(loaded.theme).toBe('system');
    expect(loaded.chartRange).toEqual(DEFAULT_SETTINGS.chartRange);
    expect(loaded.showNoteNames).toBe(false);
  });
});

describe('backup', () => {
  it('round-trips everything, including audio, into a fresh database', async () => {
    const recording = await addRecording('Baseline');
    await repos.journal.create({ feeling: 'wonderful', body: 'First try', recordingId: recording.id });
    await repos.progress.completeLesson('pitch-1');
    await repos.settings.save({ ...DEFAULT_SETTINGS, locale: 'ro' });

    const backup = await repos.exportBackup({ includeRecordings: true }, DEFAULT_SETTINGS);
    const text = JSON.stringify(backup);

    const otherDb = await openVoiceBloomDB(`test-${crypto.randomUUID()}`);
    const other = createRepositories(otherDb);
    const result = await other.importBackup(text, DEFAULT_SETTINGS);

    expect(result).toEqual({ recordings: 1, journal: 1, progress: 1, skipped: 0 });
    expect((await other.recordings.list())[0]).toEqual(recording);
    expect(new Uint8Array((await other.recordings.getAudio(recording.id))!.data)).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    expect((await other.journal.list())[0]?.recordingId).toBe(recording.id);
    expect((await other.settings.load()).locale).toBe('ro');
    otherDb.close();
  });

  it('can leave recordings out, unlinking journal references on import', async () => {
    const recording = await addRecording();
    await repos.journal.create({ feeling: null, body: 'Linked', recordingId: recording.id });

    const backup = await repos.exportBackup({ includeRecordings: false }, DEFAULT_SETTINGS);
    expect(backup.recordings).toEqual([]);

    const otherDb = await openVoiceBloomDB(`test-${crypto.randomUUID()}`);
    const other = createRepositories(otherDb);
    await other.importBackup(JSON.stringify(backup), DEFAULT_SETTINGS);
    expect((await other.journal.list())[0]?.recordingId).toBeNull();
    otherDb.close();
  });

  it('rejects files that are not VoiceBloom backups', () => {
    const reason = (text: string) => {
      try {
        parseBackup(text, DEFAULT_SETTINGS);
        return 'accepted';
      } catch (error) {
        return error instanceof BackupError ? error.reason : 'other';
      }
    };
    expect(reason('{not json')).toBe('invalid-json');
    expect(reason('{"hello":"world"}')).toBe('not-a-backup');
    expect(reason('{"format":"voicebloom-backup","version":99}')).toBe('unsupported-version');
  });

  it('drops malformed analysis fields from imported recordings', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'voicebloom-backup',
        version: 1,
        recordings: [
          {
            meta: {
              id: 'r1',
              createdAt: 1,
              durationMs: 1000,
              mimeType: 'audio/webm',
              analysis: { ...analysis, resonance: { formantSpacingHz: 'bright' } },
            },
            audio: { mimeType: 'audio/webm', base64: 'AQID' },
          },
        ],
      }),
      DEFAULT_SETTINGS,
    );
    expect(parsed.recordings[0]?.meta.analysis?.resonance).toBeNull();
    expect(parsed.recordings[0]?.meta.analysis?.summary?.medianHz).toBe(180);
    expect(parsed.recordings[0]?.meta.sizeBytes).toBe(3);
  });

  it('keeps analyses from before vocal weight was measured, and drops a malformed weight', () => {
    const imported = (analysisValue: unknown) =>
      parseBackup(
        JSON.stringify({
          format: 'voicebloom-backup',
          version: 1,
          recordings: [
            {
              meta: { id: 'r1', createdAt: 1, durationMs: 1000, mimeType: 'audio/webm', analysis: analysisValue },
              audio: { mimeType: 'audio/webm', base64: 'AQID' },
            },
          ],
        }),
        DEFAULT_SETTINGS,
      ).recordings[0]?.meta.analysis;

    const { voice: _omitted, ...versionOne } = { ...analysis, version: 1 };
    const older = imported(versionOne);
    expect(older?.version).toBe(1);
    expect(older?.voice).toBeNull();
    expect(older?.resonance?.formantSpacingHz).toBe(1110);

    expect(imported(analysis)?.voice).toEqual({ h1h2Db: 5.4, frames: 40 });
    expect(imported({ ...analysis, voice: { h1h2Db: 'light', frames: 40 } })?.voice).toBeNull();
    expect(imported({ ...analysis, version: 99 })).toBeNull();
  });

  it('skips malformed items instead of importing them', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'voicebloom-backup',
        version: 1,
        settings: {},
        progress: [{ lessonId: 'ok', startedAt: 1, completedStepIds: ['a', 5, 'a'] }, { lessonId: '../bad' }],
        journal: [{ id: 'j1', createdAt: 1, body: 'hi', feeling: 'ecstatic' }, 'nonsense'],
        recordings: [{ meta: { id: 'r1' } }],
      }),
      DEFAULT_SETTINGS,
    );
    expect(parsed.progress).toEqual([
      expect.objectContaining({ lessonId: 'ok', completedStepIds: ['a'] }),
    ]);
    expect(parsed.journal).toEqual([expect.objectContaining({ id: 'j1', feeling: null })]);
    expect(parsed.recordings).toEqual([]);
    expect(parsed.skipped).toBe(3);
  });
});

describe('erase everything', () => {
  it('clears every store', async () => {
    await addRecording();
    await repos.journal.create({ feeling: null, body: 'x' });
    await repos.progress.completeLesson('a');
    await repos.settings.save({ ...DEFAULT_SETTINGS, onboardingCompleted: true });

    await repos.eraseEverything();

    expect(await repos.recordings.list()).toEqual([]);
    expect(await repos.journal.list()).toEqual([]);
    expect(await repos.progress.list()).toEqual([]);
    expect(await repos.settings.load()).toEqual(DEFAULT_SETTINGS);
  });
});
