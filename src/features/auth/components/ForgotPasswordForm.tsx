import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlert } from 'lucide-react';

import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas/auth';

export interface ForgotPasswordFormProps {
  onSubmit: (values: ForgotPasswordInput) => void | Promise<void>;
  pending?: boolean;
  errorMessage?: string | null;
}

/** Presentational "request a reset link" form (single email field). */
export function ForgotPasswordForm({ onSubmit, pending = false, errorMessage }: ForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => void onSubmit(v))} noValidate className="grid gap-4">
        {errorMessage && (
          <div
            role="alert"
            className="border-destructive/35 bg-destructive/10 text-destructive-tint-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <FormField
          name="email"
          label="E-posta"
          help="Hesabınıza bağlı kurumsal e-posta adresi. Sıfırlama bağlantısını buraya göndeririz."
          required
        >
          <Input
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="ad.soyad@example.net"
            disabled={pending}
            data-action="fill-email"
            data-entity="auth"
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={pending}
          className="mt-1 w-full transition-transform active:scale-[0.99]"
          data-action="submit-forgot-password"
          data-entity="auth"
        >
          Sıfırlama bağlantısı gönder
        </Button>
      </form>
    </Form>
  );
}
