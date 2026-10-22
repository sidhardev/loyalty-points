import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development: the website runs on :4000 and forwards /api (and the server-rendered SEO pages and sitemap) to the API on :4001 (see server/scripts/dev.mjs).
// In production one server on :4000 serves both.
// `npm run build` also makes a server build of the homepage, which scripts/prerender.mjs turns into static HTML.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: { port: 4000, strictPort: true, proxy: { '/api': 'http://localhost:4001', '/for': 'http://localhost:4001', '/hi/for': 'http://localhost:4001', '/guide': 'http://localhost:4001', '/hi/guide': 'http://localhost:4001', '/privacy': 'http://localhost:4001', '/terms': 'http://localhost:4001', '/sitemap.xml': 'http://localhost:4001' } },
  preview: { port: 4000, strictPort: true },
  // The manifest tells the prerender which stylesheet and script the homepage needs; it's deleted afterwards.
  build: isSsrBuild ? { outDir: 'dist-ssr', copyPublicDir: false } : { manifest: true },
}));
