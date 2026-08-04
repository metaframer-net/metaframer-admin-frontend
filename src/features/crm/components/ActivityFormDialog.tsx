import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { activityFormSchema, ACTIVITY_TYPES } from '../schemas/activity';
import type { ActivityFormValues } from '../schemas/activity';
import { ACTIVITY_TYPE_LABELS } from '../data/crm';

interface ActivityFormDialogProps {
  onSubmit: (values: ActivityFormValues) => Promise<void>;
}

export function ActivityFormDialog({ onSubmit }: ActivityFormDialogProps) {
  const [open, setOpen] = useState(false);

  const methods = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: 'note',
      subject: '',
      description: '',
      scheduledAt: '',
    },
  });

  async function handleSubmit(values: ActivityFormValues) {
    await onSubmit(values);
    setOpen(false);
    methods.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-action="create" data-entity="activity">
          <Plus className="size-4" /> Aktivite Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Aktivite</DialogTitle>
          <DialogDescription>Arama, toplantı, not veya görev ekleyin.</DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={(e) => void methods.handleSubmit(handleSubmit)(e)} className="space-y-4">
            <FormField name="type" label="Tip" help="Aktivite tipi.">
              {(field) => (
                <select
                  id={field.id}
                  name={field.name}
                  value={field.value as string}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={field['aria-invalid']}
                  aria-describedby={field['aria-describedby']}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  data-entity="activity"
                  data-action="edit-field"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField name="subject" label="Konu" help="Aktivitenin kısa başlığı.">
              <Input data-entity="activity" data-action="edit-field" />
            </FormField>

            <FormField name="description" label="Açıklama" help="Detaylı açıklama (opsiyonel).">
              <Textarea rows={3} data-entity="activity" data-action="edit-field" />
            </FormField>

            <FormField name="scheduledAt" label="Tarih/Saat" help="Planlanan tarih ve saat (opsiyonel).">
              <Input type="datetime-local" data-entity="activity" data-action="edit-field" />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" loading={methods.formState.isSubmitting} data-action="create" data-entity="activity">
                Ekle
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
