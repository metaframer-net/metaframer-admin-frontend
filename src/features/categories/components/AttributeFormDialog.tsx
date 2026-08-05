import { useEffect, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { ATTRIBUTE_TYPES, ATTRIBUTE_TYPE_LABELS } from '../data/categories';
import {
  attributeFormSchema,
  validateAttributeKeyUnique,
  type AttributeField,
  type AttributeFormValues,
} from '../schemas/category';

export interface AttributeFormDialogProps {
  /** When present the dialog edits this attribute; otherwise it creates one. */
  attribute?: AttributeField;
  /** Sibling attributes, for key-uniqueness validation. */
  existing: AttributeField[];
  onSubmit: (values: AttributeFormValues) => void | Promise<void>;
  trigger?: ReactNode;
}

const EMPTY: AttributeFormValues = { key: '', label: '', type: 'text', required: false, options: [] };

/** Add/edit a single dynamic attribute field, including a select-options editor. */
export function AttributeFormDialog({ attribute, existing, onSubmit, trigger }: AttributeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(attribute);
  const form = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY,
  });
  const options = useFieldArray({ control: form.control, name: 'options' });
  const type = useWatch({ control: form.control, name: 'type' });

  useEffect(() => {
    if (open) {
      form.reset(
        attribute
          ? {
              key: attribute.key,
              label: attribute.label,
              type: attribute.type,
              required: attribute.required,
              unit: attribute.unit ?? '',
              options: attribute.options ?? [],
            }
          : EMPTY,
      );
    }
  }, [open, attribute, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!validateAttributeKeyUnique(values.key, existing, attribute?.id)) {
      form.setError('key', { message: 'Bu anahtar bu kategoride zaten var.' });
      return;
    }
    const payload: AttributeFormValues = {
      key: values.key,
      label: values.label,
      type: values.type,
      required: values.required,
      ...(values.unit?.trim() ? { unit: values.unit.trim() } : {}),
      ...(values.type === 'select' ? { options: values.options ?? [] } : {}),
    };
    await onSubmit(payload);
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" data-action={editing ? 'edit' : 'create'} data-entity="attribute">
            {editing ? 'Düzenle' : 'Nitelik ekle'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Niteliği düzenle' : 'Yeni nitelik'}</DialogTitle>
          <DialogDescription>Bu kategorinin ilan formunda görünecek dinamik alan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <FormField name="label" label="Etiket" help="Kullanıcıya gösterilen alan adı (ör. Brüt Alan)." required>
              <Input placeholder="Brüt Alan" data-action="edit-field" data-entity="attribute" />
            </FormField>

            <FormField
              name="key"
              label="Alan anahtarı"
              help="Form verisinde kullanılan sabit anahtar (camelCase, ör. grossArea)."
              required
            >
              <Input placeholder="grossArea" data-action="edit-field" data-entity="attribute" />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField name="type" label="Tip" help="Alanın veri tipi; Seçim tipinde seçenek listesi tanımlarsınız.">
                {(f) => (
                  <Select value={(f.value as string) || 'text'} onValueChange={f.onChange}>
                    <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ATTRIBUTE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField
                name="unit"
                label="Birim"
                help="İsteğe bağlı ölçü birimi (ör. m², yıl). Sayı alanlarında gösterilir."
                helper="İsteğe bağlı."
              >
                <Input placeholder="m²" data-action="edit-field" data-entity="attribute" />
              </FormField>
            </div>

            <FormField
              name="required"
              label="Zorunlu alan"
              help="Açık olduğunda ilan oluştururken bu alanın doldurulması gerekir."
              helper="Zorunlu alanlar formda yıldız ile işaretlenir."
            >
              {(f) => (
                <div className="flex items-center">
                  <Switch
                    id={f.id}
                    checked={Boolean(f.value)}
                    onCheckedChange={f.onChange}
                    aria-describedby={f['aria-describedby']}
                    data-action="toggle-required"
                    data-entity="attribute"
                  />
                </div>
              )}
            </FormField>

            {type === 'select' && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Seçenekler</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => options.append({ value: '', label: '' })}
                    data-action="add-option"
                    data-entity="attribute"
                  >
                    <Plus className="size-4" /> Seçenek
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Her satırda bir <strong>değer</strong> (kod) ve <strong>etiket</strong> (görünen ad) çifti girin.
                  {options.fields.length === 0 && ' En az bir seçenek ekleyin.'}
                </p>
                <ul className="space-y-2">
                  {options.fields.map((field, i) => (
                    <li key={field.id} className="flex items-center gap-2">
                      <Input
                        {...form.register(`options.${i}.value`)}
                        placeholder="deger"
                        aria-label={`Seçenek ${i + 1} değeri`}
                        data-action="edit-field"
                        data-entity="attribute"
                      />
                      <Input
                        {...form.register(`options.${i}.label`)}
                        placeholder="Etiket"
                        aria-label={`Seçenek ${i + 1} etiketi`}
                        data-action="edit-field"
                        data-entity="attribute"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => options.remove(i)}
                        aria-label={`Seçenek ${i + 1} sil`}
                        data-action="remove-option"
                        data-entity="attribute"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {form.formState.errors.options && (
                  <p className="text-destructive text-xs" role="alert">
                    {form.formState.errors.options.message ?? 'Seçenekleri kontrol edin.'}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                data-action={editing ? 'confirm-edit' : 'confirm-create'}
                data-entity="attribute"
              >
                {editing ? 'Kaydet' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
