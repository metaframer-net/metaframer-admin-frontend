import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';
import { configure } from 'storybook/test';

import * as previewAnnotations from './preview';

// Browser play/a11y tests share one saturated event loop when the whole suite runs
// in parallel, so a story's async query (e.g. `findByRole('alert')` on an error
// branch) can legitimately need longer than testing-library's 1000ms default to
// see its element — a file that passes in isolation then times out under load.
// Widen the async-util timeout so `findBy*`/`waitFor` tolerate that contention;
// `retry: 2` (vitest.config) still absorbs the rare genuinely-transient flake.
configure({ asyncUtilTimeout: 5000 });

const annotations = setProjectAnnotations([previewAnnotations]);

// Run Storybook's `beforeAll` (loaders, decorators bootstrap) for the vitest project.
beforeAll(annotations.beforeAll);
