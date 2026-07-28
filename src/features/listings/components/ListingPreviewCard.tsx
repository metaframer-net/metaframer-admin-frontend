import { ImageIcon, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  CATEGORY_LABELS,
  DEED_LABELS,
  HEATING_LABELS,
  LOCATIONS,
  ZONING_LABELS,
  type Category,
} from '../data/taxonomy';

export interface ListingPreviewValues {
  title?: string;
  category?: Category;
  price?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  grossArea?: string;
  rooms?: string;
  buildingAge?: string;
  floor?: string;
  heating?: string;
  deedStatus?: string;
  zoning?: string;
}

function heat(v?: string) {
  return v && v in HEATING_LABELS ? HEATING_LABELS[v as keyof typeof HEATING_LABELS] : undefined;
}
function deed(v?: string) {
  return v && v in DEED_LABELS ? DEED_LABELS[v as keyof typeof DEED_LABELS] : undefined;
}
function zone(v?: string) {
  return v && v in ZONING_LABELS ? ZONING_LABELS[v as keyof typeof ZONING_LABELS] : undefined;
}

/**
 * Live listing preview — the card the ad will render as, driven by the current
 * wizard form values. Shown on the final "Önizleme & yayın" step so the user
 * sees exactly what they are publishing. Token-only.
 */
export function ListingPreviewCard({ values }: { values: ListingPreviewValues }) {
  const priceNum = values.price && /^\d+$/.test(values.price) ? Number(values.price) : undefined;
  const location = [values.il ? (LOCATIONS[values.il]?.label ?? values.il) : undefined, values.ilce, values.mahalle]
    .filter(Boolean)
    .join(' · ');

  const pills = [
    values.grossArea && `${values.grossArea} m²`,
    values.rooms,
    values.buildingAge && `${values.buildingAge} yaş`,
    values.floor && `${values.floor}. kat`,
    heat(values.heating),
    deed(values.deedStatus),
    zone(values.zoning),
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="bg-card w-full max-w-xs overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="from-primary/25 to-accent/25 relative grid aspect-[16/10] place-items-center bg-gradient-to-br">
        <ImageIcon className="text-foreground/40 size-7" aria-hidden="true" />
        <Badge variant="secondary" className="absolute left-2 top-2">
          Taslak
        </Badge>
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-sm font-semibold">{values.title || 'İlan başlığı'}</h3>
        {location && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <MapPin className="size-3" aria-hidden="true" />
            {location}
          </p>
        )}
        <p className="mt-2 font-mono text-lg font-bold tabular-nums">
          {priceNum !== undefined ? (
            `${priceNum.toLocaleString('tr-TR')} ₺`
          ) : (
            <span className="text-muted-foreground text-sm font-normal">Fiyat girilmedi</span>
          )}
        </p>
        {values.category && <p className="text-muted-foreground mt-1 text-xs">{CATEGORY_LABELS[values.category]}</p>}
        {pills.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {pills.map((p) => (
              <span key={p} className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
