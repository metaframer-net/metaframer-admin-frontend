import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { CATEGORY_LABELS, LOCATIONS, STATUSES, STATUS_LABELS } from '../data/taxonomy';
import type { Listing } from '../schemas/listing';
import { AiSuggestionBadge } from './AiSuggestionBadge';

/** Accent dot per status column (paired with the label — never color-only). */
const STATUS_DOT: Record<Listing['status'], string> = {
  draft: 'bg-muted-foreground',
  pending: 'bg-warning',
  active: 'bg-success',
  expired: 'bg-muted-foreground',
  archived: 'bg-muted-foreground',
  rejected: 'bg-destructive',
};

export interface ListingKanbanProps {
  listings: Listing[];
}

/**
 * Moderation board — one column per status, cards grouped from the current page.
 * A read-first board (drag-to-transition is a follow-up); each card links to the
 * detail page and carries AI-first data attributes.
 */
export function ListingKanban({ listings }: ListingKanbanProps) {
  if (listings.length === 0) {
    return <EmptyState title="Kayıt bulunamadı" description="Filtreleri değiştirin ya da yeni bir ilan oluşturun." />;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Durum panosu">
      {STATUSES.map((status) => {
        const items = listings.filter((l) => l.status === status);
        return (
          <section
            key={status}
            role="listitem"
            className="bg-card/40 flex max-h-[32rem] w-72 shrink-0 flex-col rounded-xl border border-border"
          >
            <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-sm font-semibold">
              <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
              {STATUS_LABELS[status]}
              <span className="text-muted-foreground bg-muted ml-auto rounded-full px-2 text-xs tabular-nums">
                {items.length}
              </span>
            </header>
            <div className="flex flex-col gap-2.5 overflow-y-auto p-2.5">
              {items.map((l) => (
                <Link
                  key={l.id}
                  to={`/listings/${l.id}`}
                  data-action="open-detail"
                  data-entity="listing"
                  className="bg-card hover:border-primary/40 rounded-lg border border-border p-3 shadow-xs transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold">{l.title}</span>
                    <span className="ml-auto shrink-0">
                      <AiSuggestionBadge suggestion={l.aiSuggestion} reasons={l.aiReasons} />
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-mono">{l.id}</span>
                    <span>·</span>
                    <span>{CATEGORY_LABELS[l.category]}</span>
                    <span>·</span>
                    <span>{LOCATIONS[l.il]?.label ?? l.il}</span>
                  </div>
                  <div className="mt-2.5 border-t border-dashed border-border pt-2 font-mono text-sm font-semibold tabular-nums">
                    {l.price.toLocaleString('tr-TR')} ₺
                  </div>
                </Link>
              ))}
              {items.length === 0 && <p className="text-muted-foreground px-1 py-4 text-center text-xs">Bu durumda ilan yok.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
