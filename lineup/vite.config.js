import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client runs on 5173 in dev and proxies API + websocket traffic to the
// Express/Socket.io server on 3001.
export default defineConfig({
  // On GitHub Pages the app is served from a repo subpath, e.g. /Nutrition-App/.
  // The deploy workflow sets VITE_BASE; locally it defaults to "/".
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
