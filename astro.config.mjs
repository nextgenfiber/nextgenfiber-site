import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nextgenfiberllc.com',
  trailingSlash: 'never',
  build: { format: 'file' },
});
