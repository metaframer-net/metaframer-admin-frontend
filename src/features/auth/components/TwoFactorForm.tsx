import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlert } from 'lucide-react';

import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { twoFactorSchema, type TwoFactorInput } from '../schemas/auth';

export interface TwoFactorFormProps {
  onSubmit: (code: string) => void | Promise<void>;
  pending?: boolean;
  errorMessage?: string | null;
}

/** Presentational 2FA code entry (6-digit TOTP). Container-free for Storybook. */
export function TwoFactorForm({ onSubmit, pending = false, errorMessage }: TwoFactorFormProps) {
  const form = useForm<TwoFactorInput>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: '' },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => void onSubmit(v.code))}
        noValidate
        className="grid gap-4"
      >
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
          name="code"
          label="Doğrulama kodu"
          help="Kimlik doğrulama uygulamanızdaki (Authenticator) 6 haneli kodu girin. Demo kodu: 123456."
          required
        >
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-[0.4em]"
            disabled={pending}
            data-action="fill-2fa-code"
            data-entity="auth"
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={pending}
          className="mt-1 w-full transition-transform active:scale-[0.99]"
          data-action="submit-2fa"
          data-entity="auth"
        >
          Doğrula
        </Button>
      </form>
    </Form>
  );
}
