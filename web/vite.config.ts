import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development: the website runs on :4000 and forwards /api to the API on :4001 (see server/scripts/dev.mjs).
// In production one server on :4000 serves both.
export default defineConfig({
  plugins: [react()],
  server: { port: 4000, strictPort: true, proxy: { '/api': 'http://localhost:4001' } },
  preview: { port: 4000, strictPort: true },
});
