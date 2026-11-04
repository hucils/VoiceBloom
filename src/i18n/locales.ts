export type Locale = 'en' | 'ro';

export const LOCALES: readonly Locale[] = ['en', 'ro'];

/** Each language's name in that language, for the language picker. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: 'English',
  ro: 'Română',
};

/** Text that exists in every supported language. Used by lesson content. */
export type LocalizedText = Readonly<Record<Locale, string>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Picks the first supported language from the browser's preference list. */
export function resolveLocale(preferred: readonly string[] | undefined): Locale {
  for (const tag of preferred ?? []) {
    const language = tag.toLowerCase().split('-')[0];
    if (isLocale(language)) return language;
  }
  return 'en';
}
