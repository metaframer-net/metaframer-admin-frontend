import { Filter } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RangeInput, type RangeValue } from '@/components/form/RangeInput';
import { DatePicker } from '@/components/form/DatePicker';
import type { FilterConfig } from './types';
import type { TableUrlState } from './use-table-url-state';
import { asArray, filterActiveCount } from './filter-utils';

export interface ColumnHeaderFilterProps {
  filter: FilterConfig;
  state: TableUrlState;
}

/**
 * Per-column header filter (DATA_TABLE_SPEC point 2). A funnel button — rendered
 * on the LEFT of the column label by the DataTable — opens a popover whose body
 * matches the filter kind. It writes to the SAME URL-synced filter state as the
 * toolbar FilterBar, so both surfaces stay in sync and chips update everywhere.
 */
export function ColumnHeaderFilter({ filter, state }: ColumnHeaderFilterProps) {
  const active = filterActiveCount(filter, state);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          // Small visual target in a dense header, but a widened transparent hit
          // zone (pseudo-element) keeps it graspable per the 44px guideline.
          className={cn(
            'text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring relative inline-flex size-6 items-center justify-center rounded outline-none after:absolute after:-inset-2.5 after:content-[""] focus-visible:ring-2',
            active > 0 && 'text-primary',
          )}
          aria-label={`${filter.label} sütununu filtrele`}
          aria-pressed={active > 0}
          data-action="open-column-filter"
          data-entity="table"
        >
          <Filter className="size-3.5" />
          {active > 0 && (
            <span
              className="bg-primary absolute -right-0.5 -top-0.5 size-1.5 rounded-full"
              aria-hidden="true"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="text-muted-foreground border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide">
          {filter.label}
        </div>
        <div className="p-2">
          <FilterBody filter={filter} state={state} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterBody({ filter, state }: ColumnHeaderFilterProps) {
  if (filter.kind === 'faceted') return <FacetedBody filter={filter} state={state} />;
  if (filter.kind === 'numberRange') return <NumberRangeBody filter={filter} state={state} />;
  if (filter.kind === 'dateRange') return <DateRangeBody filter={filter} state={state} />;
  return <SearchBody filter={filter} state={state} />;
}

function FacetedBody({ filter, state }: ColumnHeaderFilterProps) {
  const selected = asArray(state.filters[filter.id]);
  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    state.setFilter(filter.id, filter.multiple === false ? (next.slice(-1)[0] ?? null) : next);
  };
  return (
    <div className="max-h-64 space-y-1 overflow-y-auto">
      {filter.options?.map((option) => (
        <label
          key={option.value}
          className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
        >
          <Checkbox
            checked={selected.includes(option.value)}
            onCheckedChange={() => toggle(option.value)}
            aria-label={option.label}
          />
          <span className="flex-1">{option.label}</span>
          {option.count !== undefined && (
            <span className="text-muted-foreground text-xs tabular-nums">{option.count}</span>
          )}
        </label>
      ))}
    </div>
  );
}

function NumberRangeBody({ filter, state }: ColumnHeaderFilterProps) {
  const min = state.filters[`${filter.id}Min`];
  const max = state.filters[`${filter.id}Max`];
  const value: RangeValue = {
    min: typeof min === 'string' && min ? Number(min) : undefined,
    max: typeof max === 'string' && max ? Number(max) : undefined,
  };
  return (
    <RangeInput
      {...(filter.unit ? { unit: filter.unit } : {})}
      value={value}
      onChange={(v) => {
        state.setFilter(`${filter.id}Min`, v.min !== undefined ? String(v.min) : null);
        state.setFilter(`${filter.id}Max`, v.max !== undefined ? String(v.max) : null);
      }}
    />
  );
}

function DateRangeBody({ filter, state }: ColumnHeaderFilterProps) {
  const parse = (v: string | string[] | undefined) => (typeof v === 'string' && v ? new Date(v) : undefined);
  const toIso = (d: Date | undefined) => (d ? d.toISOString().slice(0, 10) : null);
  return (
    <div className="space-y-2">
      <div className="grid gap-1.5">
        <span className="text-muted-foreground text-xs">Başlangıç</span>
        <DatePicker
          value={parse(state.filters[`${filter.id}From`])}
          onChange={(d) => state.setFilter(`${filter.id}From`, toIso(d))}
          aria-label={`${filter.label} başlangıç tarihi`}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-muted-foreground text-xs">Bitiş</span>
        <DatePicker
          value={parse(state.filters[`${filter.id}To`])}
          onChange={(d) => state.setFilter(`${filter.id}To`, toIso(d))}
          aria-label={`${filter.label} bitiş tarihi`}
        />
      </div>
    </div>
  );
}

function SearchBody({ filter, state }: ColumnHeaderFilterProps) {
  const value = typeof state.filters[filter.id] === 'string' ? (state.filters[filter.id] as string) : '';
  return (
    <Input
      value={value}
      onChange={(e) => state.setFilter(filter.id, e.target.value || null)}
      placeholder={`${filter.label} içinde ara…`}
      aria-label={`${filter.label} içinde ara`}
    />
  );
}
