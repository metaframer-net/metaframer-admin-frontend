import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, TriangleAlert } from 'lucide-react';

import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { changePasswordSchema, type ChangePasswordInput } from '../schemas/auth';

export interface ChangePasswordFormProps {
  onSubmit: (values: { currentPassword: string; newPassword: string }) => void | Promise<void>;
  pending?: boolean;
  errorMessage?: string | null;
}

/** Presentational change-password form (current + new + confirm). */
export function ChangePasswordForm({ onSubmit, pending = false, errorMessage }: ChangePasswordFormProps) {
  const [show, setShow] = React.useState(false);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) =>
          void onSubmit({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
        )}
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

        <FormField name="currentPassword" label="Mevcut şifre" help="Şu anda kullandığınız şifre." required>
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={pending}
            data-action="fill-current-password"
            data-entity="auth"
          />
        </FormField>

        <FormField
          name="newPassword"
          label="Yeni şifre"
          help="En az 8 karakter; en az bir harf ve bir rakam içermeli."
          required
        >
          {(field) => (
            <div className="relative">
              <Input
                id={field.id}
                name={field.name}
                value={field.value as string}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref as React.Ref<HTMLInputElement>}
                disabled={pending}
                aria-invalid={field['aria-invalid']}
                aria-describedby={field['aria-describedby']}
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="pr-11"
                data-action="fill-new-password"
                data-entity="auth"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-pressed={show}
                aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-2 after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
                data-action="toggle-password-visibility"
                data-entity="auth"
              >
                {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </FormField>

        <FormField name="confirm" label="Yeni şifre (tekrar)" help="Yeni şifrenin aynısını girin." required>
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={pending}
            data-action="fill-confirm-password"
            data-entity="auth"
          />
        </FormField>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={pending}
            className="transition-transform active:scale-[0.99]"
            data-action="submit-change-password"
            data-entity="auth"
          >
            Şifreyi güncelle
          </Button>
        </div>
      </form>
    </Form>
  );
}
