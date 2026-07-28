import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUSES, STATUS_LABELS } from '../data/taxonomy';
import type { Listing } from '../schemas/listing';

export interface ListingStatusSelectProps {
  value: Listing['status'];
  onChange: (status: Listing['status']) => void;
  disabled?: boolean;
}

/**
 * Inline row status quick-edit for the listings table. Renders as a compact
 * Select of the six statuses; changing it fires `onChange` (wired to the
 * optimistic PATCH mutation at the page level). Stops row-click propagation so
 * opening the menu never navigates to the detail page.
 */
export function ListingStatusSelect({ value, onChange, disabled = false }: ListingStatusSelectProps) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select value={value} onValueChange={(v) => onChange(v as Listing['status'])} disabled={disabled}>
        <SelectTrigger
          size="sm"
          className="h-8 w-auto min-w-32 text-xs"
          aria-label="İlan durumunu değiştir"
          data-action="edit-status"
          data-entity="listing"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
