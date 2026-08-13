import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import { FieldHelp } from '@/components/form/FieldHelp';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '../schemas/auth';

export interface LoginFormProps {
  /** Submit handler — the container wires this to the login mutation. */
  onSubmit: (values: LoginInput) => void | Promise<void>;
  /** Disables inputs + shows the button spinner while the request is in flight. */
  pending?: boolean;
  /** Form-level error (e.g. a 401 "wrong credentials"); rendered above the fields. */
  errorMessage?: string | null;
}

/**
 * Presentational login form (RHF + Zod). Deliberately container-free — it takes
 * `onSubmit`/`pending`/`errorMessage` so it can be exercised in Storybook with
 * no network. `LoginPage` supplies the real behaviour via `useLogin`.
 */
export function LoginForm({ onSubmit, pending = false, errorMessage }: LoginFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const remember = form.watch('remember');

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
          help="Kurumsal e-posta adresiniz (örn. ad.soyad@example.net)."
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

        <FormField
          name="password"
          label="Şifre"
          help="Şifrenizi unuttuysanız 'Şifremi unuttum' bağlantısını kullanın."
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
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-11"
                data-action="fill-password"
                data-entity="auth"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-2 after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
                data-action="toggle-password-visibility"
                data-entity="auth"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </FormField>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="login-remember"
              checked={remember ?? false}
              onCheckedChange={(v) => form.setValue('remember', v === true)}
              disabled={pending}
              data-action="toggle-remember"
              data-entity="auth"
            />
            <Label htmlFor="login-remember" className="text-muted-foreground font-normal">
              Beni hatırla
            </Label>
            <FieldHelp
              label="Beni hatırla hakkında"
              help="Bu cihazda oturumunuzun daha uzun süre açık kalmasını sağlar. Ortak cihazlarda kapalı tutun."
            />
          </div>
          <Link
            to="/forgot-password"
            className="text-primary text-sm font-medium hover:underline"
            data-action="navigate"
            data-entity="auth"
          >
            Şifremi unuttum
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={pending}
          className={cn('mt-1 w-full transition-transform active:scale-[0.99]')}
          data-action="submit-login"
          data-entity="auth"
        >
          Giriş yap
        </Button>
      </form>
    </Form>
  );
}
