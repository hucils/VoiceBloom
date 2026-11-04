// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { CEDILLA_FORMS, findMasculineAddress } from '../test/romanian';
import { en } from './messages/en';
import { ro } from './messages/ro';
import { getMessage, listMessageKeys, type MessageLeaf, type MessageTree } from './translate';

const forms = (leaf: MessageLeaf): string[] => (typeof leaf === 'string' ? [leaf] : Object.values(leaf.forms));
const placeholders = (leaf: MessageLeaf) =>
  new Set(forms(leaf).flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1])));

const bundles = { en, ro } as Record<string, MessageTree>;
const keys = listMessageKeys(en);

describe('interface messages', () => {
  it('have the same keys in every language', () => {
    for (const [locale, bundle] of Object.entries(bundles)) {
      expect(listMessageKeys(bundle), locale).toEqual(keys);
    }
  });

  it('have no empty or untrimmed text', () => {
    for (const [locale, bundle] of Object.entries(bundles)) {
      for (const key of keys) {
        for (const text of forms(getMessage(bundle, key)!)) {
          expect(text.trim(), `${locale}:${key}`).not.toBe('');
          expect(text, `${locale}:${key}`).toBe(text.trim());
        }
      }
    }
  });

  it('use the same placeholders in every language', () => {
    for (const key of keys) {
      const expected = placeholders(getMessage(en, key)!);
      expect(placeholders(getMessage(ro, key)!), key).toEqual(expected);
    }
  });

  it('give Romanian plurals all three forms it needs (one, few, other)', () => {
    for (const key of keys) {
      const leaf = getMessage(ro, key)!;
      if (typeof leaf === 'string') continue;
      expect(leaf.forms.one, key).toBeDefined();
      expect(leaf.forms.few, key).toBeDefined();
      expect(leaf.forms.other, key).toBeDefined();
    }
  });

  it('write Romanian with comma-below ș and ț', () => {
    const all = keys.flatMap((key) => forms(getMessage(ro, key)!)).join('\n');
    expect(all).not.toMatch(CEDILLA_FORMS);
  });

  it('address the reader in the feminine in Romanian', () => {
    const offenders = keys.flatMap((key) => forms(getMessage(ro, key)!).flatMap(findMasculineAddress));
    expect(offenders).toEqual([]);
  });
});

describe('the feminine-address check itself', () => {
  it('flags masculine forms addressed to the reader', () => {
    expect(findMasculineAddress('Înregistrează când ești pregătit.')).toEqual(['ești pregătit']);
    expect(findMasculineAddress('Devii mai atent la ea.')).toEqual(['Devii mai atent']);
    expect(findMasculineAddress('Fii blând cu tine.')).toEqual(['Fii blând']);
  });

  it('accepts feminine forms', () => {
    expect(findMasculineAddress('Înregistrează când ești pregătită.')).toEqual([]);
    expect(findMasculineAddress('Devii mai atentă la ea. Fii blândă cu tine.')).toEqual([]);
  });
});
