import { createContext, use, useEffect, useMemo, type ReactNode } from 'react';

import { createFormatters, type Formatters } from './format';
import type { Locale, LocalizedText } from './locales';
import { en, type Messages } from './messages/en';
import { ro } from './messages/ro';
import { createTranslator, type Translator } from './translate';

const BUNDLES: Readonly<Record<Locale, Messages>> = { en, ro };

export interface I18n {
  locale: Locale;
  /** Interface text. */
  t: Translator<Messages>;
  format: Formatters;
  /** Picks the current language from bilingual lesson content. */
  l: (text: LocalizedText) => string;
}

export function createI18n(locale: Locale): I18n {
  return {
    locale,
    t: createTranslator(locale, BUNDLES[locale], en),
    format: createFormatters(locale),
    l: (text) => text[locale],
  };
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => createI18n(locale), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
