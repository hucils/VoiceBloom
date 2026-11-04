// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { createFormatters } from './format';
import { resolveLocale } from './locales';
import { createTranslator, listMessageKeys, plural } from './translate';

const en = {
  greeting: 'Hello, {name}!',
  recordings: plural({ zero: 'No recordings yet', one: '{count} recording', other: '{count} recordings' }),
  nested: { deep: { value: 'Deep' } },
};

const ro = {
  greeting: 'Bună, {name}!',
  recordings: plural({
    zero: 'Nicio înregistrare',
    one: '{count} înregistrare',
    few: '{count} înregistrări',
    other: '{count} de înregistrări',
  }),
  nested: { deep: { value: 'Adânc' } },
};

describe('translator', () => {
  it('interpolates parameters', () => {
    const t = createTranslator('en', en);
    expect(t('greeting', { name: 'Sam' })).toBe('Hello, Sam!');
    expect(t('nested.deep.value')).toBe('Deep');
  });

  it('chooses English plural forms', () => {
    const t = createTranslator('en', en);
    expect(t('recordings', { count: 0 })).toBe('No recordings yet');
    expect(t('recordings', { count: 1 })).toBe('1 recording');
    expect(t('recordings', { count: 5 })).toBe('5 recordings');
  });

  it('chooses Romanian plural forms, including "de" from 20 upwards', () => {
    const t = createTranslator('ro', ro);
    expect(t('recordings', { count: 1 })).toBe('1 înregistrare');
    expect(t('recordings', { count: 3 })).toBe('3 înregistrări');
    expect(t('recordings', { count: 19 })).toBe('19 înregistrări');
    expect(t('recordings', { count: 20 })).toBe('20 de înregistrări');
    expect(t('recordings', { count: 101 })).toBe('101 înregistrări');
  });

  it('formats numbers in parameters for the locale', () => {
    const t = createTranslator('ro', ro);
    expect(t('greeting', { name: 2.5 })).toBe('Bună, 2,5!');
  });

  it('falls back to another bundle, then to the key itself', () => {
    const t = createTranslator('ro', { greeting: 'Bună, {name}!' } as unknown as typeof en, en);
    expect(t('nested.deep.value')).toBe('Deep');
    expect((t as (key: string) => string)('does.not.exist')).toBe('does.not.exist');
  });

  it('lists every leaf key', () => {
    expect(listMessageKeys(en)).toEqual(['greeting', 'recordings', 'nested.deep.value']);
  });
});

describe('locale resolution', () => {
  it('picks the first supported browser language', () => {
    expect(resolveLocale(['ro-RO', 'en-US'])).toBe('ro');
    expect(resolveLocale(['de-DE', 'en-GB'])).toBe('en');
    expect(resolveLocale(['fr'])).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });
});

describe('formatters', () => {
  it('formats measurements for each locale', () => {
    const en = createFormatters('en');
    const ro = createFormatters('ro');
    expect(en.hz(182.4)).toBe('182 Hz');
    expect(en.decimal(8.25)).toBe('8.3');
    expect(ro.decimal(8.25)).toBe('8,3');
    expect(en.note(6, 3)).toBe('F♯3');
    expect(ro.note(9, 3)).toBe('La3');
  });

  it('formats durations as m:ss', () => {
    const f = createFormatters('en');
    expect(f.duration(0)).toBe('0:00');
    expect(f.duration(42_400)).toBe('0:42');
    expect(f.duration(725_000)).toBe('12:05');
  });

  it('describes recent days relatively', () => {
    const f = createFormatters('en');
    const now = new Date(2026, 10, 4, 15, 0).getTime();
    expect(f.relativeDay(new Date(2026, 10, 4, 9, 0).getTime(), now)).toBe('today');
    expect(f.relativeDay(new Date(2026, 10, 3, 23, 0).getTime(), now)).toBe('yesterday');
    expect(f.relativeDay(new Date(2026, 9, 1).getTime(), now)).toBe(f.date(new Date(2026, 9, 1).getTime()));
  });
});
