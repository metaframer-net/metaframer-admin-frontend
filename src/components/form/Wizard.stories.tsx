import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Wizard, type WizardStep } from './Wizard';
import { FormField } from './FormField';
import { Input } from '@/components/ui/input';

const schema = z.object({
  title: z.string().min(3, 'En az 3 karakter'),
  price: z.string().regex(/^\d+$/, 'Fiyat girin'),
});
type Values = z.infer<typeof schema>;

function Harness({
  withAside = false,
  variant = 'horizontal' as 'horizontal' | 'vertical',
}: { withAside?: boolean; variant?: 'horizontal' | 'vertical' } = {}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', price: '' },
    mode: 'onBlur',
  });

  const steps: WizardStep<Values>[] = [
    {
      id: 'basic',
      title: 'Temel',
      hint: 'Başlık ipucu',
      description: 'İlanın başlığı.',
      fields: ['title'],
      content: (
        <FormField name="title" label="Başlık" helper="Kısa ve açıklayıcı.">
          <Input placeholder="Örn. Deniz manzaralı 2+1" />
        </FormField>
      ),
    },
    {
      id: 'price',
      title: 'Fiyat',
      fields: ['price'],
      content: (
        <FormField name="price" label="Fiyat" help="TL cinsinden toplam tutar.">
          <Input inputMode="numeric" placeholder="0" />
        </FormField>
      ),
    },
    {
      id: 'review',
      title: 'Özet',
      content: <p className="text-sm text-muted-foreground">Bilgileri gözden geçirip tamamlayın.</p>,
    },
  ];

  return (
    <div className={withAside ? 'w-full max-w-3xl' : 'w-96'}>
      <Wizard
        form={form}
        steps={steps}
        onComplete={() => {}}
        stepsVariant={variant}
        {...(withAside
          ? {
              aside: (ctx: { index: number; total: number }) => (
                <div data-testid="rail" className="text-muted-foreground text-sm">
                  Yardım rayı · Adım {ctx.index + 1}/{ctx.total}
                </div>
              ),
            }
          : {})}
      />
    </div>
  );
}

const meta = {
  title: 'Form/Wizard',
  parameters: { layout: 'padded' },
  render: () => <Harness />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Temel' })).toBeInTheDocument();
  },
};

export const BlocksInvalidStep: Story = {
  play: async ({ canvas }) => {
    // Advancing with an empty required field stays on step 1.
    await userEvent.click(canvas.getByRole('button', { name: 'Devam' }));
    await expect(await canvas.findByText('En az 3 karakter')).toBeInTheDocument();
  },
};

export const AdvancesWhenValid: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByPlaceholderText('Örn. Deniz manzaralı 2+1'), 'Deniz manzaralı 2+1');
    await userEvent.click(canvas.getByRole('button', { name: 'Devam' }));
    await expect(await canvas.findByPlaceholderText('0')).toBeInTheDocument();
  },
};

/** Optional dynamic helper rail beside the steps; it updates as the step advances. */
export const WithAside: Story = {
  render: () => <Harness withAside />,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('rail')).toHaveTextContent('Adım 1/3');
    await userEvent.type(canvas.getByPlaceholderText('Örn. Deniz manzaralı 2+1'), 'Deniz manzaralı 2+1');
    await userEvent.click(canvas.getByRole('button', { name: 'Devam' }));
    await waitFor(() => expect(canvas.getByTestId('rail')).toHaveTextContent('Adım 2/3'));
  },
};

/** Left vertical progress rail (hint subtitles render only in this variant). */
export const Vertical: Story = {
  render: () => <Harness variant="vertical" withAside />,
  play: async ({ canvas }) => {
    // The hint subtitle is unique to the vertical rail.
    await expect(canvas.getByText('Başlık ipucu')).toBeInTheDocument();
    await expect(canvas.getByRole('navigation', { name: 'Adımlar' })).toBeInTheDocument();
  },
};

export const Loading: Story = { render: () => <div className="bg-muted h-64 w-96 animate-pulse rounded" /> };
export const Empty: Story = { render: () => <Harness /> };
export const Error: Story = { ...BlocksInvalidStep };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
