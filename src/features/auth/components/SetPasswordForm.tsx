import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setPasswordSchema, type SetPasswordInput } from '../schemas/auth';

/** Coarse password strength score (0–3): length, extra length, and symbols. */
export function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

const STRENGTH = [
  { label: 'Çok zayıf', bar: 'bg-destructive', text: 'text-destructive-tint-foreground' },
  { label: 'Zayıf', bar: 'bg-destructive', text: 'text-destructive-tint-foreground' },
  { label: 'Orta', bar: 'bg-warning', text: 'text-warning-foreground' },
  { label: 'Güçlü', bar: 'bg-success', text: 'text-success-foreground' },
] as const;

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  const meta = STRENGTH[score];
  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full', i < score ? meta.bar : 'bg-muted')}
          />
        ))}
      </div>
      <p className={cn('mt-1 text-xs', meta.text)}>Şifre gücü: {meta.label}</p>
    </div>
  );
}

export interface SetPasswordFormProps {
  onSubmit: (values: SetPasswordInput) => void | Promise<void>;
  pending?: boolean;
  errorMessage?: string | null;
  /** Submit button label (differs for reset vs invite). */
  submitLabel?: string;
}

/**
 * Presentational "set a new password" form (reset + accept-invite). Password +
 * confirmation with a strength meter and a reveal toggle. Container-free so it
 * can be exercised in Storybook with no network.
 */
export function SetPasswordForm({
  onSubmit,
  pending = false,
  errorMessage,
  submitLabel = 'Şifreyi kaydet',
}: SetPasswordFormProps) {
  const [show, setShow] = React.useState(false);
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const password = form.watch('password');

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
          name="password"
          label="Yeni şifre"
          help="En az 8 karakter; en az bir harf ve bir rakam içermeli."
          required
        >
          {(field) => (
            <div>
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
              <PasswordStrength password={(field.value as string) ?? password} />
            </div>
          )}
        </FormField>

        <FormField
          name="confirm"
          label="Yeni şifre (tekrar)"
          help="Yukarıdaki şifrenin aynısını girin."
          required
        >
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={pending}
            data-action="fill-confirm-password"
            data-entity="auth"
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={pending}
          className="mt-1 w-full transition-transform active:scale-[0.99]"
          data-action="submit-set-password"
          data-entity="auth"
        >
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
