import { EmptyState } from '@/components/feedback/EmptyState';

export interface DataGalleryProps<TData> {
  data: TData[];
  renderCard: (item: TData) => React.ReactNode;
  getKey: (item: TData) => string;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
}

/**
 * Generic responsive grid gallery. Each feature passes its own card renderer.
 */
export function DataGallery<TData>({
  data,
  renderCard,
  getKey,
  emptyTitle = 'Kayıt bulunamadı',
  emptyDescription = 'Filtreleri değiştirin veya yeni kayıt oluşturun.',
}: DataGalleryProps<TData>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {data.map((item) => (
        <li key={getKey(item)}>{renderCard(item)}</li>
      ))}
    </ul>
  );
}
