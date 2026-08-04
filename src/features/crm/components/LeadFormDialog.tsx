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
import { leadFormSchema, LEAD_STAGES, LEAD_PRIORITIES, defaultProbability } from '../schemas/lead';
import type { LeadFormValues } from '../schemas/lead';
import { LEAD_STAGE_LABELS, LEAD_PRIORITY_LABELS, CONTACT_SOURCE_LABELS } from '../data/crm';
import { CONTACT_SOURCES } from '../schemas/contact';

interface LeadFormDialogProps {
  contactId?: string;
  onSubmit: (values: LeadFormValues) => Promise<void>;
}

export function LeadFormDialog({ contactId, onSubmit }: LeadFormDialogProps) {
  const [open, setOpen] = useState(false);

  const methods = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      contactId: contactId ?? '',
      title: '',
      stage: 'new',
      priority: 'medium',
      value: '',
      probability: String(defaultProbability('new')),
      source: 'web',
      expectedCloseDate: '',
      lostReason: '',
    },
  });

  const watchStage = methods.watch('stage');

  async function handleSubmit(values: LeadFormValues) {
    await onSubmit(values);
    setOpen(false);
    methods.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-action="create" data-entity="lead">
          <Plus className="size-4" /> Yeni Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Lead Oluştur</DialogTitle>
          <DialogDescription>Satış fırsatı takibi için yeni lead ekleyin.</DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={(e) => void methods.handleSubmit(handleSubmit)(e)} className="space-y-4">
            {!contactId && (
              <FormField name="contactId" label="Kişi ID" help="Lead'in bağlı olacağı kişi ID'si.">
                <Input placeholder="C-3000" data-entity="lead" data-action="edit-field" />
              </FormField>
            )}

            <FormField name="title" label="Başlık" help="Lead'in kısa açıklaması.">
              <Input data-entity="lead" data-action="edit-field" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="stage" label="Aşama" help="Lead'in pipeline aşaması.">
                {(field) => (
                  <select
                    id={field.id}
                    name={field.name}
                    value={field.value as string}
                    onChange={(e) => {
                      field.onChange(e);
                      const stage = e.target.value as (typeof LEAD_STAGES)[number];
                      methods.setValue('probability', String(defaultProbability(stage)));
                    }}
                    onBlur={field.onBlur}
                    aria-invalid={field['aria-invalid']}
                    aria-describedby={field['aria-describedby']}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    data-entity="lead"
                    data-action="edit-field"
                  >
                    {LEAD_STAGES.map((s) => (
                      <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField name="priority" label="Öncelik" help="Lead öncelik seviyesi.">
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
                    data-entity="lead"
                    data-action="edit-field"
                  >
                    {LEAD_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField name="value" label="Değer (₺)" help="Beklenen anlaşma tutarı.">
                <Input type="number" data-entity="lead" data-action="edit-field" />
              </FormField>
              <FormField name="probability" label="Olasılık (%)" help="Kazanma olasılığı (0–100).">
                <Input type="number" data-entity="lead" data-action="edit-field" />
              </FormField>
              <FormField name="source" label="Kaynak" help="Lead'in edinilme kanalı.">
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
                    data-entity="lead"
                    data-action="edit-field"
                  >
                    {CONTACT_SOURCES.map((s) => (
                      <option key={s} value={s}>{CONTACT_SOURCE_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <FormField name="expectedCloseDate" label="Tahmini Kapanış" help="Anlaşmanın beklenen kapanış tarihi.">
              <Input type="date" data-entity="lead" data-action="edit-field" />
            </FormField>

            {watchStage === 'lost' && (
              <FormField name="lostReason" label="Kayıp Gerekçesi" help="Anlaşmanın neden kaybedildiğini açıklayın.">
                <Input data-entity="lead" data-action="edit-field" />
              </FormField>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" loading={methods.formState.isSubmitting} data-action="create" data-entity="lead">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
