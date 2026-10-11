import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the API runs separately on :3000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
