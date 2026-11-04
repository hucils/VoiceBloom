import type { ChangeNotifier } from './changes';
import { createId, type VoiceBloomDB } from './db';
import type { JournalEntry, VoiceFeeling } from './types';
import { TEXT_LIMITS } from './validation';

export interface JournalDraft {
  feeling: VoiceFeeling | null;
  body: string;
  recordingId?: string | null;
  lessonId?: string | null;
}

export type JournalRepository = ReturnType<typeof createJournalRepository>;

const cleanBody = (body: string) => body.slice(0, TEXT_LIMITS.journalBody);

export function createJournalRepository(db: VoiceBloomDB, notifier: ChangeNotifier) {
  return {
    /** All entries, newest first. */
    async list(): Promise<JournalEntry[]> {
      const all = await db.getAllFromIndex('journal', 'by-created');
      return all.reverse();
    },

    get(id: string): Promise<JournalEntry | undefined> {
      return db.get('journal', id);
    },

    async create(draft: JournalDraft, now = Date.now()): Promise<JournalEntry> {
      const entry: JournalEntry = {
        id: createId(),
        createdAt: now,
        updatedAt: now,
        feeling: draft.feeling,
        body: cleanBody(draft.body),
        recordingId: draft.recordingId ?? null,
        lessonId: draft.lessonId ?? null,
      };
      await db.add('journal', entry);
      notifier.notify('journal');
      return entry;
    },

    async update(id: string, patch: Partial<JournalDraft>, now = Date.now()): Promise<JournalEntry | undefined> {
      const tx = db.transaction('journal', 'readwrite');
      const existing = await tx.store.get(id);
      if (!existing) {
        await tx.done;
        return undefined;
      }
      const updated: JournalEntry = {
        ...existing,
        ...(patch.feeling !== undefined && { feeling: patch.feeling }),
        ...(patch.body !== undefined && { body: cleanBody(patch.body) }),
        ...(patch.recordingId !== undefined && { recordingId: patch.recordingId }),
        ...(patch.lessonId !== undefined && { lessonId: patch.lessonId }),
        updatedAt: now,
      };
      await tx.store.put(updated);
      await tx.done;
      notifier.notify('journal');
      return updated;
    },

    async remove(id: string): Promise<void> {
      await db.delete('journal', id);
      notifier.notify('journal');
    },
  };
}
