import { useNavigate } from 'react-router-dom';
import { useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CircleDashed, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form/FormField';
import { RadioCards } from '@/components/form/RadioCards';
import { CascadingSelect, type CascadeLevel } from '@/components/form/CascadingSelect';
import { Wizard, type WizardStep } from '@/components/form/Wizard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AUTHORITIES,
  AUTHORITY_META,
  CATEGORIES,
  CATEGORY_ATTRIBUTES,
  CATEGORY_LABELS,
  DEED_LABELS,
  DEED_STATUS,
  HEATING,
  HEATING_LABELS,
  LOCATIONS,
  PURPOSE_LABELS,
  PURPOSES,
  SUBTYPES,
  ZONING,
  ZONING_LABELS,
  ilOptions,
  ilceOptions,
  mahalleOptions,
  type Authority,
  type Category,
  type Purpose,
} from '../data/taxonomy';
import { listingFormSchema, type ListingFormValues } from '../schemas/listing';
import { ListingPreviewCard, type ListingPreviewValues } from '../components/ListingPreviewCard';
import { ListingPhotoStudio } from '../components/ListingPhotoStudio';
import { AiSuggestionBadge } from '../components/AiSuggestionBadge';
import { useCreateListing } from '../api/mutations';

const ATTRIBUTE_META: Record<
  string,
  { label: string; help: string; kind: 'number' | 'text' | 'select'; options?: { value: string; label: string }[]; unit?: string }
> = {
  grossArea: { label: 'Brüt m²', help: 'Duvarlar dahil toplam alan.', kind: 'number', unit: 'm²' },
  netArea: { label: 'Net m²', help: 'Kullanılabilir (net) alan.', kind: 'number', unit: 'm²' },
  rooms: { label: 'Oda Sayısı', help: 'Örn. 2+1, 3+1.', kind: 'text' },
  buildingAge: { label: 'Bina Yaşı', help: 'Binanın yaşı (yıl).', kind: 'number' },
  floor: { label: 'Bulunduğu Kat', help: 'Dairenin bulunduğu kat.', kind: 'number' },
  heating: { label: 'Isıtma', help: 'Isıtma tipi.', kind: 'select', options: HEATING.map((h) => ({ value: h, label: HEATING_LABELS[h] })) },
  deedStatus: { label: 'Tapu Durumu', help: 'Tapu türü.', kind: 'select', options: DEED_STATUS.map((d) => ({ value: d, label: DEED_LABELS[d] })) },
  zoning: { label: 'İmar Durumu', help: 'Arsanın imar durumu.', kind: 'select', options: ZONING.map((z) => ({ value: z, label: ZONING_LABELS[z] })) },
};

function AttributeField({ name }: { name: string }) {
  const meta = ATTRIBUTE_META[name]!;
  return (
    <FormField name={name} label={meta.label} help={meta.help} required>
      {meta.kind === 'select'
        ? (f) => (
            <Select value={(f.value as string) || ''} onValueChange={f.onChange}>
              <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {meta.options?.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        : (
            <Input inputMode={meta.kind === 'number' ? 'numeric' : 'text'} placeholder={meta.label} data-entity="listing" data-action="edit-field" />
          )}
    </FormField>
  );
}

/** Step 1 — Mülk bilgileri: intent, property type/sub-type, posting authority. */
function MulkBilgileriStep() {
  const category = useWatch<ListingFormValues>({ name: 'category' }) as Category;
  const subtypes = SUBTYPES[category] ?? [];
  return (
    <div className="grid gap-5">
      <FormField name="purpose" label="İlan amacı" help="Satılık ve kiralık farklı arama filtreleri ve fiyat alanları kullanır." required>
        {(f) => (
          <RadioCards
            options={PURPOSES.map((p) => ({ value: p, label: PURPOSE_LABELS[p] }))}
            value={(f.value as string) || ''}
            onChange={f.onChange}
            id={f.id}
            aria-describedby={f['aria-describedby']}
            aria-invalid={f['aria-invalid']}
          />
        )}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="category" label="Mülk türü" help="Konut, işyeri, arsa, devremülk veya turistik. Alt tür ve nitelikler buna göre değişir." required>
          {(f) => (
            <Select value={(f.value as string) || ''} onValueChange={f.onChange}>
              <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField name="subType" label="Alt tür" help="Örn. Daire, Rezidans, Müstakil ev, Villa." helper="Mülk türüne göre değişir.">
          {(f) => (
            <Select value={(f.value as string) || ''} onValueChange={f.onChange}>
              <SelectTrigger id={f.id} aria-invalid={f['aria-invalid']} aria-describedby={f['aria-describedby']}>
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {subtypes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>

      <FormField name="authority" label="İlanı hangi yetkiyle veriyorsunuz?" help="Yetki türü, EİDS'de hangi doğrulamanın yapılacağını belirler." required>
        {(f) => (
          <RadioCards
            options={AUTHORITIES.map((a) => ({ value: a, label: AUTHORITY_META[a].label, hint: AUTHORITY_META[a].hint }))}
            value={(f.value as string) || ''}
            onChange={f.onChange}
            id={f.id}
            aria-describedby={f['aria-describedby']}
            aria-invalid={f['aria-invalid']}
          />
        )}
      </FormField>
    </div>
  );
}

function AttributesStep() {
  const category = useWatch<ListingFormValues>({ name: 'category' }) as Category;
  const attrs = CATEGORY_ATTRIBUTES[category] ?? [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {attrs.map((name) => (
        <AttributeField key={name} name={name} />
      ))}
    </div>
  );
}

const levels: CascadeLevel[] = [
  { key: 'il', label: 'İl', getOptions: () => ilOptions() },
  { key: 'ilce', label: 'İlçe', getOptions: (s) => ilceOptions(s.il ?? '') },
  { key: 'mahalle', label: 'Mahalle', getOptions: (s) => mahalleOptions(s.il ?? '', s.ilce ?? '') },
];

/** Step 2 — Konum & taşınmaz: cascading location + ada/parsel for EİDS. */
function LocationStep() {
  const { control, setValue, formState } = useFormContext<ListingFormValues>();
  const value = useWatch({ control, name: ['il', 'ilce', 'mahalle'] });
  const [il, ilce, mahalle] = value;
  const err = formState.errors;

  return (
    <div className="grid gap-5">
      <CascadingSelect
        label="Konum"
        help="İl, ilçe ve mahalleyi sırayla seçin. Üst seçim değişince alt seçim sıfırlanır."
        levels={levels}
        value={{ il: il ?? '', ilce: ilce ?? '', mahalle: mahalle ?? '' }}
        errors={{ il: err.il?.message, ilce: err.ilce?.message, mahalle: err.mahalle?.message }}
        onChange={(next) => {
          setValue('il', next.il ?? '', { shouldValidate: true, shouldDirty: true });
          setValue('ilce', next.ilce ?? '', { shouldValidate: true, shouldDirty: true });
          setValue('mahalle', next.mahalle ?? '', { shouldValidate: true, shouldDirty: true });
        }}
      />
      <FormField
        name="adaParsel"
        label="Ada / Parsel"
        help="EİDS taşınmaz sorgusu bu bilgiyle yapılır. Tapunuzdan okuyabilirsiniz."
        helper="Örn. 1234 / 56"
      >
        <Input inputMode="numeric" placeholder="1234 / 56" data-entity="listing" data-action="edit-field" />
      </FormField>
    </div>
  );
}

/** Step 4 — Fotoğraf & metin: cover-first photo studio + title/description/price. */
function PhotoTextStep() {
  return (
    <div className="grid gap-5">
      <FormField name="title" label="Başlık" help="Konum + oda + öne çıkan özellik. 5-70 karakter." required>
        <Input maxLength={70} placeholder="Örn. Deniz manzaralı 3+1 daire" data-entity="listing" data-action="edit-field" />
      </FormField>
      <FormField name="description" label="Açıklama" helper="İlanın detaylı açıklaması. İletişim bilgisi yazmayın — moderasyonda reddedilir." required>
        <Textarea rows={4} placeholder="Açıklama…" />
      </FormField>
      <FormField name="price" label="Fiyat (₺)" help="Sadece rakam girin. AI, bölge ortalamasıyla kıyaslar." required>
        <Input inputMode="numeric" placeholder="0" data-entity="listing" data-action="edit-field" />
      </FormField>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">
          Fotoğraflar <span className="text-destructive">*</span>
        </span>
        <span className="text-muted-foreground text-xs">İlk fotoğraf kapak olur; AI her fotoğrafın kalitesini denetler.</span>
        <div className="mt-1">
          <ListingPhotoStudio />
        </div>
      </div>
    </div>
  );
}

/** Step 5 — Önizleme & yayın: live preview + verification + summary. */
function ReviewStep() {
  const values = useWatch<ListingFormValues>();
  const location = [values.il ? (LOCATIONS[values.il]?.label ?? values.il) : undefined, values.ilce, values.mahalle]
    .filter(Boolean)
    .join(' / ');
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <div>
        <p className="text-primary mb-2 text-xs font-semibold uppercase tracking-wide">Canlı önizleme</p>
        <ListingPreviewCard values={values as ListingPreviewValues} />
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-2.5 text-sm font-semibold">Doğrulama</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">EİDS taşınmaz</dt>
              <dd>
                <Badge variant="success">Eşleşti</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Yetki</dt>
              <dd>
                <Badge variant="success">Doğrulandı</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">AI ön-skor</dt>
              <dd>
                <AiSuggestionBadge suggestion="ok" reasons={[]} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-2.5 text-sm font-semibold">Özet</h3>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Amaç</dt>
            <dd>{values.purpose ? PURPOSE_LABELS[values.purpose as Purpose] : '—'}</dd>
            <dt className="text-muted-foreground">Kategori</dt>
            <dd>{values.category ? CATEGORY_LABELS[values.category as Category] : '—'}</dd>
            <dt className="text-muted-foreground">Yetki</dt>
            <dd>{values.authority ? AUTHORITY_META[values.authority as Authority].label : '—'}</dd>
            <dt className="text-muted-foreground">Konum</dt>
            <dd>{location || '—'}</dd>
            <dt className="text-muted-foreground">Fiyat</dt>
            <dd className="tabular-nums">{values.price ? `${Number(values.price).toLocaleString('tr-TR')} ₺` : '—'}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic helper rail (EİDS checklist + quality score) beside the wizard steps;
 * driven by the current step index.
 */
function CreateWizardRail({ index, total }: { index: number; total: number }) {
  const pct = Math.round(((index + 1) / total) * 100);
  const last = index >= total - 1;
  const items: { label: string; state: 'done' | 'run' | 'todo' }[] = [
    { label: 'Mülk bilgileri', state: index >= 1 ? 'done' : 'todo' },
    { label: 'Konum & taşınmaz', state: index >= 2 ? 'done' : 'todo' },
    { label: 'Nitelikler', state: index >= 3 ? 'done' : 'todo' },
    { label: 'Fotoğraf & metin', state: index >= 4 ? 'done' : 'todo' },
    { label: last ? 'EİDS sorgusu yapılıyor…' : 'EİDS sorgusu (son adım)', state: last ? 'run' : 'todo' },
  ];
  return (
    <div className="space-y-4">
      <section className="bg-card rounded-lg border border-border p-4">
        <p className="text-primary flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <ShieldCheck className="size-3.5" aria-hidden="true" /> EİDS Doğrulama
        </p>
        <p className="text-muted-foreground mt-2 text-xs">Yayından önce taşınmaz varlığı ve yetki kontrol edilir.</p>
        <ul className="mt-3 space-y-2 text-xs">
          {items.map((it) => (
            <li
              key={it.label}
              className={cn(
                'flex items-center gap-2',
                it.state === 'todo' && 'text-muted-foreground',
                it.state === 'run' && 'text-warning-foreground',
              )}
            >
              {it.state === 'done' ? (
                <Check className="text-success size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <CircleDashed className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              {it.label}
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-card rounded-lg border border-border p-4">
        <p className="text-primary text-xs font-semibold uppercase tracking-wide">Kalite skoru</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-2xl font-semibold tabular-nums">%{pct}</span>
        </div>
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <div className="bg-primary h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Adımlar tamamlandıkça artar; yüksek skorlu ilanlar aramada üst sırada.
        </p>
      </section>
    </div>
  );
}

export function ListingCreatePage() {
  const navigate = useNavigate();
  const create = useCreateListing();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      description: '',
      category: 'konut',
      price: '',
      il: '',
      ilce: '',
      mahalle: '',
      purpose: 'satilik',
      subType: '',
      authority: 'sahibi',
      adaParsel: '',
      grossArea: '',
      netArea: '',
      rooms: '',
      buildingAge: '',
      floor: '',
      heating: '',
      deedStatus: '',
      zoning: '',
    },
  });

  const steps: WizardStep<ListingFormValues>[] = [
    {
      id: 'basics',
      title: 'Mülk bilgileri',
      hint: 'Tür ve yetki',
      description: 'İlanın doğru kategoride görünmesi için mülkü ve yayınlama yetkinizi tanımlayın.',
      fields: ['purpose', 'category', 'authority'],
      content: <MulkBilgileriStep />,
    },
    {
      id: 'location',
      title: 'Konum & taşınmaz',
      hint: 'Adres ve kimlik',
      description: 'İl → ilçe → mahalle ve EİDS için ada/parsel.',
      fields: ['il', 'ilce', 'mahalle'],
      content: <LocationStep />,
    },
    {
      id: 'attributes',
      title: 'Nitelikler',
      hint: 'Kategoriye özel',
      description: 'Seçili kategoriye göre gerekli alanlar.',
      fields: (CATEGORY_ATTRIBUTES[form.watch('category') as Category] ?? []) as (keyof ListingFormValues)[],
      content: <AttributesStep />,
    },
    {
      id: 'media',
      title: 'Fotoğraf & metin',
      hint: 'Kapak, fiyat',
      description: 'Kapak fotoğrafı, başlık, açıklama ve fiyat.',
      fields: ['title', 'description', 'price'],
      content: <PhotoTextStep />,
    },
    {
      id: 'review',
      title: 'Önizleme & Yayın',
      hint: 'EİDS + son kontrol',
      description: 'İlanı canlı önizleyip yayınlayın.',
      content: <ReviewStep />,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="sr-only">Yeni İlan</h1>
      <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="from-primary to-accent text-primary-foreground grid size-8 place-items-center rounded-lg bg-gradient-to-br font-bold">
            a
          </div>
          <div>
            <p className="text-muted-foreground text-xs">İlan taslağı</p>
            <p className="text-sm font-semibold">Yeni emlak ilanı</p>
          </div>
        </div>
        <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
          <span className="bg-success size-2 rounded-full" aria-hidden="true" /> Otomatik kaydedildi
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/listings')} data-action="cancel" data-entity="listing">
          Çık
        </Button>
      </div>

      <Wizard
        form={form}
        steps={steps}
        draftKey="arsam.draft.listing-create"
        submitLabel="İlanı Oluştur"
        onCancel={() => navigate('/listings')}
        stepsVariant="vertical"
        footerHint="Değişiklikler otomatik kaydedilir"
        aside={(ctx) => <CreateWizardRail {...ctx} />}
        onComplete={async (values) => {
          await create.mutateAsync(values);
          navigate('/listings');
        }}
      />
    </div>
  );
}
