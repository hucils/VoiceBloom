/**
 * Data hooks that re-run their query whenever the relevant data changes,
 * in this tab or another one.
 */
import { useEffect, useState, type DependencyList } from 'react';

import type { DataTopic, Repositories } from '../persistence';
import { useRepositories } from './DataContext';

export function useLiveQuery<T>(
  topics: readonly DataTopic[],
  query: (repos: Repositories) => Promise<T>,
  deps: DependencyList = [],
): T | undefined {
  const repos = useRepositories();
  const [state, setState] = useState<{ key: string; value: T } | undefined>(undefined);
  const key = JSON.stringify(deps);
  const topicList = topics.join(',');

  useEffect(() => {
    let active = true;
    const run = () => {
      query(repos).then(
        (value) => {
          if (active) setState({ key, value });
        },
        (error: unknown) => console.error('VoiceBloom query failed.', error),
      );
    };
    run();
    const unsubscribers = topicList.split(',').map((topic) => repos.notifier.subscribe(topic as DataTopic, run));
    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
    // The caller declares what `query` depends on through `deps` (captured in `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, topicList, key]);

  // Never show results that belong to different dependencies (e.g. another lesson).
  return state && state.key === key ? state.value : undefined;
}

export const useRecordings = () => useLiveQuery(['recordings'], (repos) => repos.recordings.list());

export const useRecordingsUsage = () => useLiveQuery(['recordings'], (repos) => repos.recordings.usage());

export const useJournalEntries = () => useLiveQuery(['journal'], (repos) => repos.journal.list());

export const useAllProgress = () => useLiveQuery(['progress'], (repos) => repos.progress.list());

export const useLessonProgress = (lessonId: string) =>
  useLiveQuery(['progress'], async (repos) => (await repos.progress.get(lessonId)) ?? null, [lessonId]);
