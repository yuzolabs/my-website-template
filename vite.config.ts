import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'dist',
  plugins: [cloudflare()],
  server: { host: '127.0.0.1' },
});
