import { useRef, useState } from 'react';
import { CircleCheck, ImageIcon, Sparkles, TriangleAlert, Upload, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Presentational AI quality tag per photo (paired with an icon, not color-only). */
function quality(index: number): { label: string; tone: 'ok' | 'warn' } {
  if (index === 0) return { label: 'Kalite: yüksek', tone: 'ok' };
  if (index === 2) return { label: 'Bulanık?', tone: 'warn' };
  return { label: 'OK', tone: 'ok' };
}

export interface ListingPhotoStudioProps {
  /** Initial placeholder photo count (demo/mock — real upload arrives with the backend). */
  initialCount?: number;
}

/**
 * Photo studio for the create wizard: a dropzone + a reorderable-looking grid
 * where the first photo is the cover and AI flags each photo's quality. This is
 * a presentational mock (local state, gradient placeholders) until media upload
 * ships with the backend; it matches the approved wizard mockup.
 */
export function ListingPhotoStudio({ initialCount = 3 }: ListingPhotoStudioProps) {
  const [ids, setIds] = useState<number[]>(() => Array.from({ length: initialCount }, (_, i) => i));
  const nextId = useRef(initialCount);
  const add = () => setIds((prev) => [...prev, nextId.current++]);
  const remove = (id: number) => setIds((prev) => prev.filter((x) => x !== id));

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={add}
        className="border-primary/30 bg-primary/[0.03] hover:border-primary/60 focus-visible:ring-ring flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed p-5 text-center outline-none transition-colors focus-visible:ring-2"
        data-action="add-photo"
        data-entity="listing"
      >
        <Upload className="text-primary size-7" aria-hidden="true" />
        <span className="text-sm">
          <span className="text-foreground font-medium">Fotoğrafları sürükleyin</span> veya seçmek için tıklayın
        </span>
        <span className="text-muted-foreground text-xs">JPG/PNG/HEIC · en fazla 30 adet · min 1024px</span>
      </button>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3" aria-label="Yüklenen fotoğraflar">
        {ids.map((id, i) => {
          const q = quality(i);
          return (
            <li
              key={id}
              className="from-primary/25 to-accent/25 text-foreground/40 relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-border bg-gradient-to-br"
            >
              {i === 0 && (
                <span className="bg-primary text-primary-foreground absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  Kapak
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`${i + 1}. fotoğrafı kaldır`}
                className="bg-background/80 text-foreground hover:bg-background absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full border border-border after:absolute after:-inset-3.5 after:content-['']"
                data-action="remove-photo"
                data-entity="listing"
              >
                <X className="size-3.5" />
              </button>
              <ImageIcon className="size-6" aria-hidden="true" />
              <span
                className={cn(
                  'absolute inset-x-1.5 bottom-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]',
                  q.tone === 'ok' ? 'bg-foreground/70 text-background' : 'bg-warning text-warning-foreground',
                )}
              >
                {q.tone === 'ok' ? <CircleCheck className="size-3" /> : <TriangleAlert className="size-3" />}
                {q.label}
              </span>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={add}
            aria-label="Fotoğraf ekle"
            className="text-muted-foreground hover:border-primary/60 hover:text-foreground grid aspect-square w-full place-items-center rounded-lg border-2 border-dashed border-border"
            data-action="add-photo"
            data-entity="listing"
          >
            <Upload className="size-5" />
          </button>
        </li>
      </ul>

      <div className="border-accent/40 bg-accent/[0.06] flex items-start gap-2.5 rounded-md border p-2.5">
        <span className="bg-accent/20 text-accent-foreground grid size-6 shrink-0 place-items-center rounded-md">
          <Sparkles className="size-3.5" />
        </span>
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">AI önerisi:</span> 3. fotoğraf düşük çözünürlüklü. Kapak olarak
          1. fotoğrafı önerdim (uygulandı). Watermark tespit edilmedi.
        </p>
      </div>
    </div>
  );
}
