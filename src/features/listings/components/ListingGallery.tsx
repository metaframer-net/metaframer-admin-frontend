import { Link } from 'react-router-dom';
import { ImageIcon, MapPin } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { CATEGORY_LABELS, LOCATIONS } from '../data/taxonomy';
import type { Listing } from '../schemas/listing';
import { ListingStatusBadge } from './ListingStatusBadge';
import { AiSuggestionBadge } from './AiSuggestionBadge';

export interface ListingGalleryProps {
  listings: Listing[];
}

/**
 * Cover-photo-first gallery of the current page — the same card language the
 * table collapses to on mobile. Photo is a token gradient placeholder until real
 * media arrives with the backend.
 */
export function ListingGallery({ listings }: ListingGalleryProps) {
  if (listings.length === 0) {
    return <EmptyState title="Kayıt bulunamadı" description="Filtreleri değiştirin ya da yeni bir ilan oluşturun." />;
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {listings.map((l) => (
        <li key={l.id}>
          <Link
            to={`/listings/${l.id}`}
            data-action="open-detail"
            data-entity="listing"
            className="bg-card hover:shadow-md block overflow-hidden rounded-xl border border-border shadow-xs transition-shadow"
          >
            <div className="from-primary/25 to-accent/25 relative grid aspect-[16/10] place-items-center bg-gradient-to-br">
              <ImageIcon className="text-foreground/40 size-7" aria-hidden="true" />
              <span className="absolute left-2 top-2">
                <ListingStatusBadge status={l.status} />
              </span>
              <span className="absolute right-2 top-2">
                <AiSuggestionBadge suggestion={l.aiSuggestion} reasons={l.aiReasons} />
              </span>
            </div>
            <div className="p-3">
              <h3 className="truncate text-sm font-semibold">{l.title}</h3>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <MapPin className="size-3" aria-hidden="true" />
                {LOCATIONS[l.il]?.label ?? l.il} · {l.ilce}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {l.price.toLocaleString('tr-TR')} ₺
                </span>
                <span className="text-muted-foreground text-xs">{CATEGORY_LABELS[l.category]}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
