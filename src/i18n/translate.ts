/**
 * A small, fully typed message translator.
 *
 * Messages are plain nested objects. The English bundle defines the shape;
 * every other bundle is typed against it, so a missing or extra key is a
 * compile error. Keys passed to `t()` are checked against the bundle too.
 */
import type { Locale } from './locales';

export interface PluralForms {
  /** Used when count is exactly 0, if given (e.g. "No recordings yet"). */
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface Plural {
  readonly kind: 'plural';
  readonly forms: PluralForms;
}

/** Marks a message whose wording depends on `count`, chosen with Intl.PluralRules. */
export function plural(forms: PluralForms): Plural {
  return { kind: 'plural', forms };
}

export type MessageLeaf = string | Plural;
export interface MessageTree {
  readonly [key: string]: MessageLeaf | MessageTree;
}

type Join<Prefix extends string, Key extends string> = Prefix extends '' ? Key : `${Prefix}.${Key}`;

/** Dot-separated paths of the leaves of `T` whose value type extends `Leaf`. */
export type LeafPaths<T, Leaf, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? Join<Prefix, K>
    : T[K] extends MessageLeaf
      ? never
      : LeafPaths<T[K], Leaf, Join<Prefix, K>>;
}[keyof T & string];

export type TranslationParams = Readonly<Record<string, string | number>>;

export interface Translator<M> {
  (key: LeafPaths<M, string>, params?: TranslationParams): string;
  (key: LeafPaths<M, Plural>, params: TranslationParams & { readonly count: number }): string;
}

function isPlural(value: MessageLeaf | MessageTree | undefined): value is Plural {
  return typeof value === 'object' && value !== null && value.kind === 'plural' && 'forms' in value;
}

function lookup(tree: MessageTree, key: string): MessageLeaf | undefined {
  let node: MessageLeaf | MessageTree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || isPlural(node)) return undefined;
    node = (node as MessageTree)[part];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

function interpolate(template: string, params: TranslationParams, numbers: Intl.NumberFormat): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) return placeholder;
    return typeof value === 'number' ? numbers.format(value) : value;
  });
}

export function createTranslator<M extends MessageTree>(
  locale: Locale,
  messages: M,
  fallback?: MessageTree,
): Translator<M> {
  const pluralRules = new Intl.PluralRules(locale);
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  function translate(key: string, params?: TranslationParams): string {
    const message = lookup(messages, key) ?? (fallback ? lookup(fallback, key) : undefined);
    // An unknown key renders as itself so it is easy to spot; typed keys make this rare.
    if (message === undefined) return key;

    let template: string;
    if (typeof message === 'string') {
      template = message;
    } else {
      const count = typeof params?.count === 'number' ? params.count : 0;
      const { forms } = message;
      template =
        count === 0 && forms.zero !== undefined
          ? forms.zero
          : (forms[pluralRules.select(count)] ?? forms.other);
    }
    return params ? interpolate(template, params, numbers) : template;
  }

  return translate as Translator<M>;
}

/** Every leaf path of a bundle, used by tests to check translation completeness. */
export function listMessageKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || isPlural(value)) return [path];
    return listMessageKeys(value, path);
  });
}

export function getMessage(tree: MessageTree, key: string): MessageLeaf | undefined {
  return lookup(tree, key);
}
