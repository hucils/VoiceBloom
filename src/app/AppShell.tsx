import { AudioLines, AudioWaveform, BookOpen, House, Lock, NotebookPen, Settings, type LucideIcon } from 'lucide-react';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { Logo } from '../components/Logo';
import { Onboarding } from '../features/onboarding/Onboarding';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';

const NAV = [
  { to: '/', label: 'nav.home', icon: House, end: true },
  { to: '/lessons', label: 'nav.lessons', icon: BookOpen, end: false },
  { to: '/practice', label: 'nav.practice', icon: AudioLines, end: false },
  { to: '/recordings', label: 'nav.recordings', icon: AudioWaveform, end: false },
  { to: '/journal', label: 'nav.journal', icon: NotebookPen, end: false },
] as const satisfies ReadonlyArray<{ to: string; label: string; icon: LucideIcon; end: boolean }>;

function SidebarLink({ to, end, icon: Icon, children }: { to: string; end?: boolean; icon: LucideIcon; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`
      }
    >
      <Icon aria-hidden className="size-5" />
      {children}
    </NavLink>
  );
}

function Wordmark({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <span className={`font-display text-ink [font-variation-settings:'SOFT'_100] ${size === 'md' ? 'text-xl' : 'text-lg'}`}>
      VoiceBloom
    </span>
  );
}

export function AppShell() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // On navigation, start at the top and move focus to the new page's content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  if (!settings.onboardingCompleted) return <Onboarding />;

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('nav.skipToContent')}
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur-sm lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <Logo className="size-9" />
          <Wordmark />
        </Link>
        <nav aria-label={t('nav.label')}>
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <SidebarLink to={item.to} end={item.end} icon={item.icon}>
                  {t(item.label)}
                </SidebarLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto space-y-3">
          <SidebarLink to="/settings" icon={Settings}>
            {t('nav.settings')}
          </SidebarLink>
          <p className="flex items-center gap-1.5 px-3 text-xs text-ink-subtle">
            <Lock aria-hidden className="size-3.5" />
            {t('app.privateBadge')}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-canvas/85 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-8" />
            <Wordmark size="sm" />
          </Link>
          <NavLink
            to="/settings"
            aria-label={t('nav.settings')}
            className={({ isActive }) =>
              `flex size-11 items-center justify-center rounded-full transition-colors ${
                isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-surface-muted'
              }`
            }
          >
            <Settings aria-hidden className="size-5" />
          </NavLink>
        </header>

        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-16"
        >
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[0.6875rem] leading-tight font-medium transition-colors ${
                    isActive ? 'text-accent-ink' : 'text-ink-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <item.icon aria-hidden className="size-5" />
                    </span>
                    <span className="max-w-full truncate">{t(item.label)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
