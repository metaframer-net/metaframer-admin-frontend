import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil } from 'lucide-react';
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
import { CONTACT_STATUSES, CONTACT_TYPES, CONTACT_SOURCES, contactFormSchema } from '../schemas/contact';
import type { ContactFormValues, Contact } from '../schemas/contact';
import { CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS, CONTACT_SOURCE_LABELS } from '../data/crm';

interface ContactFormDialogProps {
  contact?: Contact;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}

export function ContactFormDialog({ contact, onSubmit }: ContactFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(contact);

  const methods = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: contact?.fullName ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      company: contact?.company ?? '',
      type: contact?.type ?? 'individual',
      status: contact?.status ?? 'active',
      source: contact?.source ?? 'web',
      assigneeId: contact?.assigneeId ?? '',
      tags: contact?.tags.join(', ') ?? '',
      il: contact?.il ?? '',
      notes: contact?.notes ?? '',
    },
  });

  async function handleSubmit(values: ContactFormValues) {
    await onSubmit(values);
    setOpen(false);
    methods.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isEdit ? 'outline' : 'default'}
          size={isEdit ? 'sm' : 'default'}
          data-action={isEdit ? 'edit' : 'create'}
          data-entity="contact"
        >
          {isEdit ? <><Pencil className="size-4" /> Düzenle</> : <><Plus className="size-4" /> Yeni Kişi</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Kişi Düzenle' : 'Yeni Kişi Ekle'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Kişi bilgilerini güncelleyin.' : 'CRM sistemine yeni kişi ekleyin.'}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={(e) => void methods.handleSubmit(handleSubmit)(e)} className="space-y-4">
            <FormField name="fullName" label="Ad Soyad" help="Kişinin tam adı ve soyadı.">
              <Input data-entity="contact" data-action="edit-field" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="email" label="E-posta" help="İletişim e-posta adresi.">
                <Input type="email" data-entity="contact" data-action="edit-field" />
              </FormField>
              <FormField name="phone" label="Telefon" help="İletişim telefon numarası.">
                <Input data-entity="contact" data-action="edit-field" />
              </FormField>
            </div>

            <FormField name="company" label="Şirket" help="Bağlı şirket veya ofis adı (opsiyonel).">
              <Input data-entity="contact" data-action="edit-field" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField name="type" label="Tip" help="Kişi tipi: bireysel, danışman veya ofis.">
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
                    data-entity="contact"
                    data-action="edit-field"
                  >
                    {CONTACT_TYPES.map((t) => (
                      <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField name="status" label="Durum" help="Kişinin mevcut CRM durumu.">
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
                    data-entity="contact"
                    data-action="edit-field"
                  >
                    {CONTACT_STATUSES.map((s) => (
                      <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField name="source" label="Kaynak" help="Kişinin edinilme kanalı.">
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
                    data-entity="contact"
                    data-action="edit-field"
                  >
                    {CONTACT_SOURCES.map((s) => (
                      <option key={s} value={s}>{CONTACT_SOURCE_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <FormField name="il" label="Şehir" help="Kişinin bulunduğu il kodu.">
              <Input placeholder="34" data-entity="contact" data-action="edit-field" />
            </FormField>

            <FormField name="tags" label="Etiketler" help="Virgülle ayrılmış etiketler (opsiyonel).">
              <Input placeholder="premium, potansiyel" data-entity="contact" data-action="edit-field" />
            </FormField>

            <FormField name="notes" label="Notlar" help="Kişiye özel dahili notlar (opsiyonel).">
              <Textarea rows={3} data-entity="contact" data-action="edit-field" />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" loading={methods.formState.isSubmitting} data-action={isEdit ? 'save' : 'create'} data-entity="contact">
                {isEdit ? 'Kaydet' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
