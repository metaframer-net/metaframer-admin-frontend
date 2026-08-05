import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form } from '@/components/form/form-context';
import { FormField } from '@/components/form/FormField';
import {
  CATEGORY_ICONS,
  CATEGORY_STATUSES,
  CATEGORY_STATUS_LABELS,
} from '../data/categories';
import { categoryFormSchema, type Category, type CategoryFormValues } from '../schemas/category';

export interface CategoryFormDialogProps {
  /** When present the dialog edits this category; otherwise it creates one. */
  category?: Category;
  onSubmit: (values: CategoryFormValues) => void | Promise<void>;
  /** Custom trigger; defaults to a button. */
  trigger?: ReactNode;
}

const EMPTY: CategoryFormValues = { key: '', label: '', description: '', status: 'active' };

/** Create/edit a category's meta (key, label, description, icon, status). */
export function CategoryFormDialog({ category, onSubmit, trigger }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(category);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              key: category.key,
              label: category.label,
              description: category.description,
              status: category.status,
              ...(category.icon ? { icon: category.icon } : {}),
            }
          : EMPTY,
      );
    }
  }, [open, category, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button data-action={editing ? 'edit' : 'create'} data-entity="category">
            {editing ? 'Kategoriyi düzenle' : 'Yeni kategori'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Kategoriyi düzenle' : 'Yeni kategori'}</DialogTitle>
          <DialogDescription>
            Kategori meta bilgilerini düzenleyin. Nitelik seti detay sayfasından yönetilir.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <FormField
              name="label"
              label="Görünen ad"
              help="Kullanıcıya gösterilen kategori adı (ör. Konut)."
              required
            >
              <Input placeholder="Konut" data-action="edit-field" data-entity="category" />
            </FormField>

            <FormField
              name="key"
              label="Anahtar"
              help="Kod tarafında kullanılan sabit anahtar. Küçük harf, rakam ve tire; örneğin konut."
              helper="Oluşturduktan sonra değiştirmemeniz önerilir."
              required
            >
              <Input placeholder="konut" data-action="edit-field" data-entity="category" />
            </FormField>

            <FormField
              name="description"
              label="Açıklama"
              help="Kategoriyi kısaca tanımlayın; listede ve detayında görünür."
              helper="En fazla 280 karakter."
            >
              <Textarea rows={2} placeholder="Daire, villa, müstakil ev…" data-action="edit-field" data-entity="category" />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField name="icon" label="Simge" help="Menü ve kartlarda kullanılacak simge.">
                {(f) => (
                  <Select value={(f.value as string) || ''} onValueChange={f.onChange}>
                    <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField name="status" label="Durum" help="Arşivlenen kategoriler yeni ilanlarda gizlenir.">
                {(f) => (
                  <Select value={(f.value as string) || 'active'} onValueChange={f.onChange}>
                    <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CATEGORY_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                data-action={editing ? 'confirm-edit' : 'confirm-create'}
                data-entity="category"
              >
                {editing ? 'Kaydet' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
