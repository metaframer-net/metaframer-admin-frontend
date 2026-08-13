import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { cn } from '@/lib/utils';
import { generalFormSchema, type GeneralFormValues } from '../schemas/settings';

export interface GeneralSettingsFormProps {
  defaultValues: GeneralFormValues;
  onSubmit: (values: GeneralFormValues) => void | Promise<void>;
  /** Disable the form + show a spinner on submit. */
  submitting?: boolean;
}

/** 44px hit-area wrapper around the (small) switch — WCAG 2.2 target size. */
const SWITCH_HIT = 'inline-flex min-h-11 min-w-11 cursor-pointer items-center';

/**
 * General / system settings form. Every field carries a `FieldHelp` affordance.
 * Enabling `maintenanceMode` is guarded by a ConfirmDialog (turning the site off
 * is high-consequence); disabling it is immediate.
 */
export function GeneralSettingsForm({ defaultValues, onSubmit, submitting }: GeneralSettingsFormProps) {
  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    mode: 'onBlur',
    defaultValues,
  });
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => void onSubmit(v))} className="space-y-4" noValidate>
          <FormField
            name="siteName"
            label="Site adı"
            help="Panelde ve bildirimlerde görünen platform adı."
            required
          >
            <Input placeholder="example.net" autoComplete="off" data-action="edit-field" data-entity="settings" />
          </FormField>

          <FormField
            name="supportEmail"
            label="Destek e-postası"
            help="Kullanıcı destek taleplerinin yönlendirileceği e-posta adresi."
            required
          >
            <Input
              type="email"
              inputMode="email"
              placeholder="destek@example.net"
              autoComplete="off"
              data-action="edit-field"
              data-entity="settings"
            />
          </FormField>

          <FormField
            name="defaultLocale"
            label="Varsayılan dil"
            helper="Şimdilik yalnızca Türkçe destekleniyor."
          >
            {(field) => (
              <Input
                id={field.id}
                value="Türkçe (tr)"
                readOnly
                disabled
                aria-describedby={field['aria-describedby']}
              />
            )}
          </FormField>

          <FormField
            name="maintenanceMode"
            label="Bakım modu"
            help="Açıldığında site ziyaretçilere kapatılır (yalnızca yöneticiler erişebilir). Dikkatli kullanın."
          >
            {(field) => (
              <label className={SWITCH_HIT}>
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(v) => {
                    // Enabling is guarded; disabling is immediate.
                    if (v === true) setConfirmMaintenance(true);
                    else field.onChange(false);
                  }}
                  aria-invalid={field['aria-invalid']}
                  aria-describedby={field['aria-describedby']}
                  aria-label="Bakım modu"
                  data-action="toggle-maintenance"
                  data-entity="settings"
                />
                <span className={cn('ml-2 text-sm', field.value === true ? 'text-destructive' : 'text-muted-foreground')}>
                  {field.value === true ? 'Site kapalı' : 'Site açık'}
                </span>
              </label>
            )}
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting ?? false} data-action="save-settings" data-entity="settings">
              Kaydet
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDialog
        open={confirmMaintenance}
        onOpenChange={setConfirmMaintenance}
        title="Bakım modunu aç?"
        description="Site tüm ziyaretçilere kapatılacak ve yalnızca yöneticiler erişebilecek. Emin misiniz?"
        confirmLabel="Bakım modunu aç"
        destructive
        onConfirm={() => {
          form.setValue('maintenanceMode', true, { shouldDirty: true });
          setConfirmMaintenance(false);
        }}
      />
    </>
  );
}
