import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nextgenfiberllc.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Never inline assets as data: URIs; the CSP only allows fonts from 'self'.
  vite: { build: { assetsInlineLimit: 0 } },
});
