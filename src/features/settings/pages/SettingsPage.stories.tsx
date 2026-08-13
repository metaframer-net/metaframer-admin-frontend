import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { SettingsPage } from './SettingsPage';
import { settingsKeys } from '../api/hooks';
import { MOCK_SETTINGS, renderPage, seedQueryError } from './page-story-utils';

function seeded(settings = MOCK_SETTINGS) {
  return renderPage(<SettingsPage />, {
    path: '/settings',
    initialPath: '/settings',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: (qc) => qc.setQueryData(settingsKeys.all, settings),
  });
}

const meta = {
  title: 'Settings/Pages/Settings',
  parameters: { layout: 'fullscreen' },
  render: () => seeded(),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Ayarlar' })).toBeInTheDocument();
    // General tab is default: site name field is present.
    await expect(canvas.getByLabelText(/Site adı/)).toHaveValue('example.net');
    // Switch to the feature-flags tab and assert a flag switch renders.
    await userEvent.click(canvas.getByRole('tab', { name: 'Özellik Bayrakları' }));
    await expect(await canvas.findByRole('switch', { name: 'İlan detayında harita' })).toBeChecked();
  },
};

export const Loading: Story = {
  render: () =>
    renderPage(<SettingsPage />, {
      path: '/settings',
      initialPath: '/settings',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};

// Settings always resolve to a full envelope; the loading branch stands in for
// "empty" (there is no empty settings surface) to keep the naming matrix complete.
export const Empty: Story = {
  render: () =>
    renderPage(<SettingsPage />, {
      path: '/settings',
      initialPath: '/settings',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: () => {},
    }),
};

// A real isError state (not a mirror of Empty) — deterministic, no network.
export const Error: Story = {
  render: () =>
    renderPage(<SettingsPage />, {
      path: '/settings',
      initialPath: '/settings',
      extraRoutes: [{ path: '*', element: <div /> }],
      seed: (qc) => seedQueryError(qc, settingsKeys.all),
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  },
};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
