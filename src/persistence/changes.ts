/**
 * Lets the UI re-read data after it changes, including changes made in
 * another tab (via BroadcastChannel, when enabled).
 */
export type DataTopic = 'recordings' | 'progress' | 'journal' | 'settings';
export const ALL_TOPICS: readonly DataTopic[] = ['recordings', 'progress', 'journal', 'settings'];

type Listener = () => void;

export class ChangeNotifier {
  private readonly listeners = new Map<DataTopic, Set<Listener>>();
  private readonly channel: BroadcastChannel | null;

  constructor(options: { crossTabChannel?: string } = {}) {
    this.channel =
      options.crossTabChannel && typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(options.crossTabChannel)
        : null;
    this.channel?.addEventListener('message', (event: MessageEvent<DataTopic[]>) => {
      if (Array.isArray(event.data)) this.emit(event.data);
    });
  }

  subscribe(topic: DataTopic, listener: Listener): () => void {
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  notify(...topics: DataTopic[]): void {
    this.emit(topics);
    this.channel?.postMessage(topics);
  }

  close(): void {
    this.channel?.close();
    this.listeners.clear();
  }

  private emit(topics: readonly DataTopic[]) {
    for (const topic of new Set(topics)) {
      for (const listener of this.listeners.get(topic) ?? []) listener();
    }
  }
}
