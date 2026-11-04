import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Generates the favicon, PWA icons and Apple touch icon from a single SVG at
 * build time (see `pwaAssets` in vite.config.ts). The maskable and Apple icons
 * are padded onto the app's soft lavender background.
 */
const background = '#f7f4fd';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
});
