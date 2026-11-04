import type { RecordingAnalysis } from '../audio/analysis';
import type { ChangeNotifier } from './changes';
import { createId, type VoiceBloomDB } from './db';
import type { RecordingMeta, StoredAudio } from './types';
import { TEXT_LIMITS } from './validation';

export interface NewRecording {
  audio: ArrayBuffer;
  mimeType: string;
  durationMs: number;
  analysis: RecordingAnalysis | null;
  title?: string;
  lessonId?: string | null;
  stepId?: string | null;
}

export interface RecordingsUsage {
  count: number;
  bytes: number;
}

export type RecordingsRepository = ReturnType<typeof createRecordingsRepository>;

export function createRecordingsRepository(db: VoiceBloomDB, notifier: ChangeNotifier) {
  return {
    /** All recordings, newest first. Audio is not loaded. */
    async list(): Promise<RecordingMeta[]> {
      const all = await db.getAllFromIndex('recordings', 'by-created');
      return all.reverse();
    },

    get(id: string): Promise<RecordingMeta | undefined> {
      return db.get('recordings', id);
    },

    getAudio(id: string): Promise<StoredAudio | undefined> {
      return db.get('recordingAudio', id);
    },

    async add(input: NewRecording, now = Date.now()): Promise<RecordingMeta> {
      const id = createId();
      const meta: RecordingMeta = {
        id,
        createdAt: now,
        durationMs: Math.max(0, Math.round(input.durationMs)),
        mimeType: input.mimeType,
        sizeBytes: input.audio.byteLength,
        title: (input.title ?? '').trim().slice(0, TEXT_LIMITS.title),
        lessonId: input.lessonId ?? null,
        stepId: input.stepId ?? null,
        analysis: input.analysis,
      };
      const tx = db.transaction(['recordings', 'recordingAudio'], 'readwrite');
      await Promise.all([
        tx.objectStore('recordings').add(meta),
        tx.objectStore('recordingAudio').add({ id, data: input.audio, mimeType: input.mimeType }),
        tx.done,
      ]);
      notifier.notify('recordings');
      return meta;
    },

    async rename(id: string, title: string): Promise<void> {
      const tx = db.transaction('recordings', 'readwrite');
      const existing = await tx.store.get(id);
      if (existing) await tx.store.put({ ...existing, title: title.trim().slice(0, TEXT_LIMITS.title) });
      await tx.done;
      if (existing) notifier.notify('recordings');
    },

    /** Deletes the audio and its analysis. Journal entries that referenced it are kept but unlinked. */
    async remove(id: string): Promise<void> {
      const tx = db.transaction(['recordings', 'recordingAudio', 'journal'], 'readwrite');
      const journal = tx.objectStore('journal');
      const linked = await journal.index('by-recording').getAll(id);
      await Promise.all([
        tx.objectStore('recordings').delete(id),
        tx.objectStore('recordingAudio').delete(id),
        ...linked.map((entry) => journal.put({ ...entry, recordingId: null })),
        tx.done,
      ]);
      notifier.notify('recordings', 'journal');
    },

    async removeAll(): Promise<void> {
      const tx = db.transaction(['recordings', 'recordingAudio', 'journal'], 'readwrite');
      const journal = tx.objectStore('journal');
      const linked = await journal.index('by-recording').getAll();
      await Promise.all([
        tx.objectStore('recordings').clear(),
        tx.objectStore('recordingAudio').clear(),
        ...linked.map((entry) => journal.put({ ...entry, recordingId: null })),
        tx.done,
      ]);
      notifier.notify('recordings', 'journal');
    },

    async usage(): Promise<RecordingsUsage> {
      const all = await db.getAll('recordings');
      return { count: all.length, bytes: all.reduce((sum, recording) => sum + recording.sizeBytes, 0) };
    },
  };
}
