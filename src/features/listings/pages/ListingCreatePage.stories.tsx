import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { ListingCreatePage } from './ListingCreatePage';
import { renderPage } from './page-story-utils';

function render() {
  return renderPage(<ListingCreatePage />, {
    path: '/listings/create',
    initialPath: '/listings/create',
    extraRoutes: [{ path: '*', element: <div /> }],
    seed: () => {},
  });
}

const meta = {
  title: 'Listings/Pages/Create',
  parameters: { layout: 'fullscreen' },
  render,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Yeni İlan' })).toBeInTheDocument();
    // Step 1 is "Mülk bilgileri" (amaç / tür / yetki) — the approved 5-step flow.
    await expect(canvas.getByRole('heading', { name: 'Mülk bilgileri' })).toBeInTheDocument();
    await expect(canvas.getByText('İlan amacı')).toBeInTheDocument();
  },
};

export const BlocksInvalidStep: Story = {
  play: async ({ canvas }) => {
    // Step 1 has defaults (Satılık / Konut / Mülk sahibi), so it advances…
    await userEvent.click(canvas.getByRole('button', { name: 'Devam' }));
    await expect(await canvas.findByRole('heading', { name: 'Konum & taşınmaz' })).toBeInTheDocument();
    // …but step 2 blocks with an empty required location.
    await userEvent.click(canvas.getByRole('button', { name: 'Devam' }));
    await expect(await canvas.findByText('İl seçin')).toBeInTheDocument();
  },
};

/**
 * The dynamic helper rail (EİDS checklist + quality score) is visible from step 1
 * and reacts as the wizard advances — the score climbs %20 → %40 on the next step.
 */
export const DynamicRail: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('EİDS Doğrulama')).toBeInTheDocument();
    await expect(canvas.getByText('Kalite skoru')).toBeInTheDocument();
    await expect(canvas.getByText('%20')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Devam' }));

    await expect(await canvas.findByRole('heading', { name: 'Konum & taşınmaz' })).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('%40')).toBeInTheDocument());
  },
};

export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
export const Loading: Story = { render };
export const Empty: Story = { render };
export const Error: Story = { render };
