import { useId, useState } from 'react';
import { Bookmark, Filter, ListFilter, Plus, Search, Sparkles, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RangeInput, type RangeValue } from '@/components/form/RangeInput';
import { DatePicker } from '@/components/form/DatePicker';
import type { FilterConfig } from './types';
import type { TableUrlState } from './use-table-url-state';
import { useSavedViews } from './use-saved-views';

export interface FilterBarProps {
  tableKey: string;
  filters: FilterConfig[];
  state: TableUrlState;
  searchPlaceholder?: string;
  /** Parse free text into proposed filter params (confirm-before-apply). */
  onNaturalLanguage?: (text: string) => Record<string, string | string[]>;
}

function asArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : v ? [v] : [];
}

export function FilterBar({
  tableKey,
  filters,
  state,
  searchPlaceholder = 'Ara…',
  onNaturalLanguage,
}: FilterBarProps) {
  const { views, saveView, deleteView } = useSavedViews(tableKey);
  const nlHelpId = useId();
  const nlInputId = useId();
  const [nlText, setNlText] = useState('');
  const [nlProposal, setNlProposal] = useState<Record<string, string | string[]> | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const chips = buildChips(filters, state);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Free-text search */}
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={state.q}
            onChange={(e) => state.setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label="Arama"
            data-action="search"
            data-entity="table"
          />
        </div>

        {filters.map((filter) => (
          <FilterControl key={filter.id} filter={filter} state={state} />
        ))}

        {/* Natural-language filter box */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-action="open-nl-filter" data-entity="table">
              <Sparkles className="size-4" />
              <span className="hidden md:inline">Akıllı filtre</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-3">
              <Label htmlFor={nlInputId}>Doğal dille filtre</Label>
              <Textarea
                id={nlInputId}
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="Örn. İstanbul'da 500 m² üzeri bekleyen arsa"
                rows={2}
                aria-describedby={nlHelpId}
              />
              <p id={nlHelpId} className="text-muted-foreground text-xs">
                Sade Türkçe yazın; önerilen filtreleri uygulamadan önce onaylarsınız.
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => setNlProposal((onNaturalLanguage ?? defaultParse)(nlText))}
                data-action="parse-nl-filter"
                data-entity="table"
              >
                <ListFilter className="size-4" /> Öneri oluştur
              </Button>
              {nlProposal && (
                <div className="space-y-2 rounded-md border border-border p-2">
                  <p className="text-muted-foreground text-xs">Önerilen filtreler (onaylayın):</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(nlProposal).flatMap(([k, v]) =>
                      asArray(v).map((val) => (
                        <Badge key={`${k}-${val}`} variant="secondary">
                          {k}: {val}
                        </Badge>
                      )),
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        Object.entries(nlProposal).forEach(([k, v]) => state.setFilter(k, v));
                        setNlProposal(null);
                        setNlText('');
                      }}
                      data-action="apply-nl-filter"
                      data-entity="table"
                    >
                      Uygula
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNlProposal(null)}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Saved views */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-action="open-saved-views" data-entity="table">
              <Bookmark className="size-4" />
              <span className="hidden md:inline">Görünümler</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Kayıtlı görünümler</DropdownMenuLabel>
            {views.length === 0 && (
              <div className="text-muted-foreground px-2 py-1.5 text-xs">Henüz görünüm yok.</div>
            )}
            {views.map((view) => (
              <DropdownMenuItem key={view.id} onSelect={() => state.applySearch(view.query)} data-action="apply-view" data-entity="table">
                {view.name}
                <button
                  type="button"
                  className="ml-auto opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteView(view.id);
                  }}
                  aria-label={`${view.name} görünümünü sil`}
                >
                  <X className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setViewName('');
                setSaveOpen(true);
              }}
              data-action="save-view"
              data-entity="table"
            >
              <Plus className="size-4" /> Bu görünümü kaydet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Save-view dialog (replaces the native window.prompt) */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Görünümü kaydet</DialogTitle>
            <DialogDescription>Mevcut filtre, sıralama ve arama bir isimle saklanır.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="save-view-name">Görünüm adı</Label>
            <Input
              id="save-view-name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="Örn. Bekleyen arsa ilanları"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && viewName.trim()) {
                  saveView(viewName.trim(), state.search);
                  setSaveOpen(false);
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button
              disabled={!viewName.trim()}
              onClick={() => {
                saveView(viewName.trim(), state.search);
                setSaveOpen(false);
              }}
              data-action="confirm-save-view"
              data-entity="table"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active filter chips */}
      {(chips.length > 0 || state.q) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="text-muted-foreground size-3.5" />
          {state.q && (
            <Chip label={`Arama: ${state.q}`} onClear={() => state.setQuery('')} />
          )}
          {chips.map((chip) => (
            <Chip key={chip.key} label={chip.label} onClear={chip.onClear} />
          ))}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => state.clearAll()} data-action="clear-all-filters" data-entity="table">
            Tümünü temizle
          </Button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 py-1 pl-2 pr-1">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="hover:bg-background/60 relative rounded-sm p-0.5 after:absolute after:-inset-3.5 after:content-['']"
        aria-label={`${label} filtresini kaldır`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

function FilterControl({ filter, state }: { filter: FilterConfig; state: TableUrlState }) {
  if (filter.kind === 'faceted') return <FacetedFilter filter={filter} state={state} />;
  if (filter.kind === 'numberRange') return <NumberRangeFilter filter={filter} state={state} />;
  if (filter.kind === 'dateRange') return <DateRangeFilter filter={filter} state={state} />;
  return null;
}

function FacetedFilter({ filter, state }: { filter: FilterConfig; state: TableUrlState }) {
  const selected = asArray(state.filters[filter.id]);
  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    state.setFilter(filter.id, filter.multiple === false ? (next.slice(-1)[0] ?? null) : next);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-dashed" aria-label={`${filter.label} filtresi`} data-action="open-facet" data-entity="table">
          <Plus className="size-3.5" />
          {filter.label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 tabular-nums">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filter.options?.map((option) => (
            <label key={option.value} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
                aria-label={option.label}
              />
              <span className="flex-1">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-muted-foreground tabular-nums text-xs">{option.count}</span>
              )}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NumberRangeFilter({ filter, state }: { filter: FilterConfig; state: TableUrlState }) {
  const min = state.filters[`${filter.id}Min`];
  const max = state.filters[`${filter.id}Max`];
  const value: RangeValue = {
    min: typeof min === 'string' && min ? Number(min) : undefined,
    max: typeof max === 'string' && max ? Number(max) : undefined,
  };
  const active = value.min !== undefined || value.max !== undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2 border-dashed', active && 'border-solid')} aria-label={`${filter.label} filtresi`} data-action="open-range" data-entity="table">
          <Plus className="size-3.5" />
          {filter.label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <RangeInput
          {...(filter.unit ? { unit: filter.unit } : {})}
          value={value}
          onChange={(v) => {
            state.setFilters({
              [`${filter.id}Min`]: v.min !== undefined ? String(v.min) : null,
              [`${filter.id}Max`]: v.max !== undefined ? String(v.max) : null,
            });
          }}
          sliderMin={filter.sliderMin}
          sliderMax={filter.sliderMax}
          sliderStep={filter.sliderStep}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({ filter, state }: { filter: FilterConfig; state: TableUrlState }) {
  const fromStr = state.filters[`${filter.id}From`];
  const toStr = state.filters[`${filter.id}To`];
  const parse = (v: string | string[] | undefined) =>
    typeof v === 'string' && v ? new Date(v) : undefined;
  const toIso = (d: Date | undefined) => (d ? d.toISOString().slice(0, 10) : null);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-dashed" aria-label={`${filter.label} filtresi`} data-action="open-date-range" data-entity="table">
          <Plus className="size-3.5" />
          {filter.label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2">
        <div className="grid gap-1.5">
          <span className="text-muted-foreground text-xs">Başlangıç</span>
          <DatePicker
            value={parse(fromStr)}
            onChange={(d) => state.setFilter(`${filter.id}From`, toIso(d))}
            aria-label={`${filter.label} başlangıç tarihi`}
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-muted-foreground text-xs">Bitiş</span>
          <DatePicker
            value={parse(toStr)}
            onChange={(d) => state.setFilter(`${filter.id}To`, toIso(d))}
            aria-label={`${filter.label} bitiş tarihi`}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ChipModel {
  key: string;
  label: string;
  onClear: () => void;
}

function buildChips(filters: FilterConfig[], state: TableUrlState): ChipModel[] {
  const chips: ChipModel[] = [];
  for (const filter of filters) {
    if (filter.kind === 'faceted') {
      for (const value of asArray(state.filters[filter.id])) {
        const label = filter.options?.find((o) => o.value === value)?.label ?? value;
        chips.push({
          key: `${filter.id}-${value}`,
          label: `${filter.label}: ${label}`,
          onClear: () =>
            state.setFilter(
              filter.id,
              asArray(state.filters[filter.id]).filter((v) => v !== value),
            ),
        });
      }
    } else if (filter.kind === 'numberRange') {
      const min = state.filters[`${filter.id}Min`];
      const max = state.filters[`${filter.id}Max`];
      if (min || max) {
        chips.push({
          key: filter.id,
          label: `${filter.label}: ${min || '…'}–${max || '…'}${filter.unit ? ` ${filter.unit}` : ''}`,
          onClear: () => {
            state.clearFilter(`${filter.id}Min`);
            state.clearFilter(`${filter.id}Max`);
          },
        });
      }
    } else if (filter.kind === 'dateRange') {
      const from = state.filters[`${filter.id}From`];
      const to = state.filters[`${filter.id}To`];
      if (from || to) {
        chips.push({
          key: filter.id,
          label: `${filter.label}: ${from || '…'} → ${to || '…'}`,
          onClear: () => {
            state.clearFilter(`${filter.id}From`);
            state.clearFilter(`${filter.id}To`);
          },
        });
      }
    }
  }
  return chips;
}

/** Naive default NL parser: routes free text to the `q` param. */
function defaultParse(text: string): Record<string, string | string[]> {
  return text.trim() ? { q: text.trim() } : {};
}
