import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DEFAULT_GENERAL } from '../data/settings';
import { GeneralSettingsForm } from './GeneralSettingsForm';

const meta = {
  title: 'Settings/GeneralSettingsForm',
  component: GeneralSettingsForm,
  parameters: { layout: 'padded' },
  args: {
    defaultValues: DEFAULT_GENERAL,
    onSubmit: () => {},
  },
} satisfies Meta<typeof GeneralSettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Site adı/)).toHaveValue('example.net');
    // Enabling maintenance mode is guarded by a confirm dialog, so the switch
    // must NOT flip on the first click (it waits for confirmation).
    const maintenance = canvas.getByRole('switch', { name: 'Bakım modu' });
    await expect(maintenance).not.toBeChecked();
    await userEvent.click(maintenance);
    await expect(maintenance).not.toBeChecked();
  },
};

// Loading — the save button in its in-flight (submitting) state.
export const Loading: Story = { args: { submitting: true } };

// Empty — a fresh form with blank identity fields.
export const Empty: Story = {
  args: { defaultValues: { siteName: '', supportEmail: '', defaultLocale: 'tr', maintenanceMode: false } },
};

// Error — a submit with an invalid email surfaces the field-level error.
export const Error: Story = {
  args: { defaultValues: { siteName: 'example.net', supportEmail: 'gecersiz', defaultLocale: 'tr', maintenanceMode: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Kaydet' }));
    await expect(await canvas.findByText('Geçerli bir e-posta girin.')).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
