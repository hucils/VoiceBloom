import { describe, expect, it } from 'vitest';

import { applyTheme } from './theme';

describe('applyTheme', () => {
  it('sets an explicit dark or light class on the root element', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('follows the OS preference for "system"', () => {
    applyTheme('system');
    // The jsdom matchMedia stub reports no dark preference.
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
