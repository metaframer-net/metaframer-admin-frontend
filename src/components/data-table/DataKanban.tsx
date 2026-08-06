import { useMemo } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';

export interface KanbanColumn<TStatus extends string> {
  key: TStatus;
  label: string;
  dot?: string | undefined;
}

export interface DataKanbanProps<TData, TStatus extends string> {
  data: TData[];
  columns: readonly KanbanColumn<TStatus>[];
  getStatus: (item: TData) => TStatus;
  renderCard: (item: TData) => React.ReactNode;
  getKey: (item: TData) => string;
  entity?: string | undefined;
}

/**
 * Generic kanban board that groups items by status columns.
 * Each feature passes its own column config and card renderer.
 */
export function DataKanban<TData, TStatus extends string>({
  data,
  columns,
  getStatus,
  renderCard,
  getKey,
}: DataKanbanProps<TData, TStatus>) {
  const grouped = useMemo(() => {
    const map = new Map<TStatus, TData[]>();
    for (const col of columns) map.set(col.key, []);
    for (const item of data) {
      const status = getStatus(item);
      const list = map.get(status);
      if (list) list.push(item);
    }
    return columns.map((col) => ({ ...col, items: map.get(col.key) ?? [] }));
  }, [data, columns, getStatus]);

  if (data.length === 0) {
    return <EmptyState title="Kayıt bulunamadı" description="Filtreleri değiştirin veya yeni kayıt oluşturun." />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Durum panosu">
      {grouped.map((col) => (
        <section
          key={col.key}
          role="listitem"
          className="bg-card/40 flex max-h-[32rem] w-60 shrink-0 flex-col rounded-xl border border-border sm:w-72"
        >
          <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-sm font-semibold">
            {col.dot && <span className={`size-2 rounded-full ${col.dot}`} aria-hidden="true" />}
            {col.label}
            <span className="text-muted-foreground bg-muted ml-auto rounded-full px-2 text-xs tabular-nums">
              {col.items.length}
            </span>
          </header>
          <div className="flex flex-col gap-2.5 overflow-y-auto p-2.5">
            {col.items.map((item) => (
              <div key={getKey(item)}>{renderCard(item)}</div>
            ))}
            {col.items.length === 0 && (
              <p className="text-muted-foreground px-1 py-4 text-center text-xs">Bu durumda kayıt yok.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
