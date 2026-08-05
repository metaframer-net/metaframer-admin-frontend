import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import type { TableQuery } from '@/components/data-table/types';
import { CATEGORY_LABELS, LOCATIONS } from '../data/taxonomy';
import { useListings } from '../api/queries';
import { useModerateListing } from '../api/mutations';
import type { Listing } from '../schemas/listing';
import { AiSuggestionBadge } from '../components/AiSuggestionBadge';
import { ModerationDecision } from '../components/ModerationDecision';

const QUEUE_QUERY: TableQuery = {
  page: 1,
  pageSize: 20,
  sort: [{ id: 'createdAt', desc: false }],
  filters: { status: 'pending' },
  q: '',
};

export function ModerationQueuePage() {
  const query = useMemo(() => QUEUE_QUERY, []);
  const { data, isLoading, isError, refetch } = useListings(query);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="animate-fade-in">
        <h1 className="text-xl font-semibold sm:text-2xl">Moderasyon Kuyruğu</h1>
        <p className="text-muted-foreground text-sm">
          AI ön değerlendirme yapar; siz OK / Belirsiz / NOK olarak karar verirsiniz. Her karar denetim kaydına yazılır.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Kuyruk boş" description="Bekleyen ilan yok. Tüm ilanlar değerlendirildi." />
      ) : (
        <div className="space-y-3">
          {data.items.map((listing) => (
            <QueueItem key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItem({ listing }: { listing: Listing }) {
  const moderate = useModerateListing(listing.id);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              <Link to={`/listings/${listing.id}`} className="hover:underline" data-action="open-detail" data-entity="listing">
                {listing.title}
              </Link>
            </CardTitle>
            <CardDescription>
              {CATEGORY_LABELS[listing.category]} · {LOCATIONS[listing.il]?.label} ·{' '}
              <span className="tabular-nums">{listing.price.toLocaleString('tr-TR')} ₺</span>
            </CardDescription>
          </div>
          <AiSuggestionBadge suggestion={listing.aiSuggestion} reasons={listing.aiReasons} />
        </div>
      </CardHeader>
      <CardContent>
        <ModerationDecision
          onDecide={async (input) => {
            await moderate.mutateAsync(input);
          }}
          loading={moderate.isPending}
        />
      </CardContent>
    </Card>
  );
}
