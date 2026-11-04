export type ThemePreference = 'system' | 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

let stopFollowingSystem: (() => void) | null = null;

function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

function setResolvedTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}

/**
 * Puts `.dark` or `.light` on <html>. With "system", it keeps following the OS
 * setting until another preference is applied.
 */
export function applyTheme(preference: ThemePreference): void {
  stopFollowingSystem?.();
  stopFollowingSystem = null;

  if (preference !== 'system') {
    setResolvedTheme(preference === 'dark');
    return;
  }

  setResolvedTheme(prefersDark());
  if (typeof window.matchMedia !== 'function') return;

  const query = window.matchMedia(DARK_QUERY);
  const onChange = (event: MediaQueryListEvent) => setResolvedTheme(event.matches);
  query.addEventListener('change', onChange);
  stopFollowingSystem = () => query.removeEventListener('change', onChange);
}
