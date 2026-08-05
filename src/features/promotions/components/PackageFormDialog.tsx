import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  PACKAGE_KINDS,
  PACKAGE_KIND_LABELS,
  PACKAGE_STATUSES,
  PACKAGE_STATUS_LABELS,
} from '../data/promotions';
import { packageFormSchema, type DopingPackage, type PackageFormValues } from '../schemas/promotion';

export interface PackageFormDialogProps {
  /** When present the dialog edits this package; otherwise it creates one. */
  pkg?: DopingPackage;
  onSubmit: (values: PackageFormValues) => void | Promise<void>;
  /** Custom trigger; defaults to a button. */
  trigger?: ReactNode;
}

const EMPTY: PackageFormValues = { name: '', kind: 'featured', durationDays: '', price: '', status: 'active' };

/** Create/edit a doping package. Price + duration are numeric-strings parsed at submit. */
export function PackageFormDialog({ pkg, onSubmit, trigger }: PackageFormDialogProps) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(pkg);
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        pkg
          ? {
              name: pkg.name,
              kind: pkg.kind,
              durationDays: String(pkg.durationDays),
              price: String(pkg.price),
              status: pkg.status,
            }
          : EMPTY,
      );
    }
  }, [open, pkg, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button data-action={editing ? 'edit' : 'create'} data-entity="package">
            {editing ? 'Paketi düzenle' : 'Yeni paket'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Paketi düzenle' : 'Yeni paket'}</DialogTitle>
          <DialogDescription>Doping paketinin adı, türü, süresi, fiyatı ve durumunu belirleyin.</DialogDescription>
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
              name="name"
              label="Paket adı"
              help="Satın alma ekranında görünen ad (ör. Öne Çıkar 7 Gün)."
              required
            >
              <Input placeholder="Öne Çıkar 7 Gün" data-action="edit-field" data-entity="package" />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField name="kind" label="Tür" help="İlanın nasıl öne çıkarılacağını belirler.">
                {(f) => (
                  <Select value={(f.value as string) || 'featured'} onValueChange={f.onChange}>
                    <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {PACKAGE_KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField name="status" label="Durum" help="Arşivlenen paketler yeni satın almalarda gizlenir.">
                {(f) => (
                  <Select value={(f.value as string) || 'active'} onValueChange={f.onChange}>
                    <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PACKAGE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                name="durationDays"
                label="Süre (gün)"
                help="Dopingin kaç gün aktif kalacağı. Sadece rakam."
                required
              >
                <Input
                  inputMode="numeric"
                  placeholder="7"
                  data-action="edit-field"
                  data-entity="package"
                />
              </FormField>

              <FormField name="price" label="Fiyat (₺)" help="Paket satış fiyatı. Sadece rakam." required>
                <Input inputMode="numeric" placeholder="149" data-action="edit-field" data-entity="package" />
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
                data-entity="package"
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
