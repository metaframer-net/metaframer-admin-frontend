import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  // Env-driven so the GitHub Pages *project* site can serve from `/<repo>/`
  // while dev + Storybook stay at `/`. Set `APP_BASE` only for the app build
  // step (see .github/workflows/pages.yml); Storybook inherits `/`.
  base: process.env.APP_BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // Diagnosis-only: `ANALYZE=1 npm run build` emits a gzip-sized treemap at
    // dist/stats.html. Off for normal/CI builds so it never affects output.
    ...(process.env.ANALYZE
      ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true })]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
