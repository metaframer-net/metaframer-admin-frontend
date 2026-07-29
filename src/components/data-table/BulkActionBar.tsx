import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface BulkActionBarProps {
  selectedCount: number;
  total: number;
  /** Whether every matching row (across pages) is selected. */
  allMatchingSelected?: boolean;
  onSelectAllMatching?: () => void;
  onClear: () => void;
  /** Domain-specific bulk actions; omitted when a table has none. */
  children?: ReactNode;
}

/** Contextual bar shown while rows are selected; hosts bulk actions. */
export function BulkActionBar({
  selectedCount,
  total,
  allMatchingSelected = false,
  onSelectAllMatching,
  onClear,
  children,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div
      role="region"
      aria-label="Toplu işlemler"
      aria-live="polite"
      className="bg-card flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2 shadow-sm"
    >
      <Button variant="ghost" size="icon" onClick={onClear} aria-label="Seçimi temizle" data-action="clear-selection" data-entity="table">
        <X className="size-4" />
      </Button>
      <span className="text-sm font-medium tabular-nums">
        {allMatchingSelected ? `${total} kayıt seçildi` : `${selectedCount} seçili`}
      </span>
      {!allMatchingSelected && onSelectAllMatching && selectedCount < total && (
        <Button variant="link" size="sm" className="h-auto p-0" onClick={onSelectAllMatching} data-action="select-all-matching" data-entity="table">
          Eşleşen {total} kaydın tümünü seç
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
