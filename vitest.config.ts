import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = fileURLToPath(new URL('.', import.meta.url));
const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      // Unit project — hooks, schemas, utils, reducers (jsdom + Node MSW).
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/**/*.stories.{ts,tsx}'],
          env: { VITE_API_BASE_URL: 'http://localhost/api' },
        },
      },
      // Storybook project — interaction (play) + a11y tests in a real browser.
      {
        plugins: [
          react(),
          tailwindcss(),
          storybookTest({ configDir: `${dirname}.storybook` }),
        ],
        resolve: { alias },
        test: {
          name: 'storybook',
          // Browser (play/a11y) tests are prone to flakiness under parallel load —
          // a story can time out at render/teardown while the suite is saturated,
          // failing a file that passes in isolation. Retry absorbs those transient
          // flakes so CI doesn't go red on unrelated, non-reproducible failures.
          retry: 2,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
