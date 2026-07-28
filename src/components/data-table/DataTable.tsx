import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown, GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { DensityToggle } from '@/components/shell/DensityToggle';
import { ColumnVisibility } from './ColumnVisibility';
import { ColumnHeaderFilter } from './ColumnHeaderFilter';
import { ExportMenu, type ExportFormat, type ExportScope } from './ExportMenu';
import { DataTablePagination } from './DataTablePagination';
import { BulkActionBar } from './BulkActionBar';
import type { TableUrlState } from './use-table-url-state';

const VIRTUAL_THRESHOLD = 30;
const ROW_HEIGHT = 44;

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  total: number;
  state: TableUrlState;
  getRowId: (row: TData) => string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Filter bar slot rendered above the table. */
  filterBar?: React.ReactNode;
  /** Expandable detail row content. */
  renderSubRow?: (row: TData) => React.ReactNode;
  /** Mobile card renderer (below xl, i.e. 1024). Falls back to a simple key/value list. */
  renderMobileCard?: (row: TData, selected: boolean, toggle: () => void) => React.ReactNode;
  /** Bulk actions rendered in the selection bar. */
  bulkActions?: (selectedIds: string[], allMatching: boolean, clear: () => void) => React.ReactNode;
  /** Export handler; receives the current page rows + selection. */
  onExport?: (format: ExportFormat, scope: ExportScope, ctx: { pageRows: TData[]; selectedIds: string[] }) => void | Promise<void>;
  /** Arbitrary table meta forwarded to columns via `table.options.meta`. */
  meta?: unknown;
  /**
   * Enables column pinning (sticky left) + drag-reorder (DATA_TABLE_SPEC point 4).
   * Opt-in per table so tables that don't need it keep their default behavior.
   * A keyboard-accessible alternative (pin / move) lives in the Kolonlar menu.
   */
  columnControls?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

/** Sticky positioning + token styling for a pinned (left/right) column cell. */
function pinnedCellProps<TData>(column: Column<TData>): {
  style: React.CSSProperties;
  className: string;
} {
  const pinned = column.getIsPinned();
  if (!pinned) return { style: {}, className: '' };
  const isLastLeft = pinned === 'left' && column.getIsLastColumn('left');
  const isFirstRight = pinned === 'right' && column.getIsFirstColumn('right');
  return {
    style: {
      position: 'sticky',
      left: pinned === 'left' ? column.getStart('left') : undefined,
      right: pinned === 'right' ? column.getAfter('right') : undefined,
    },
    className: cn(
      'bg-background',
      isLastLeft && 'border-r border-border',
      isFirstRight && 'border-l border-border',
    ),
  };
}

/** Advanced, server-driven, URL-synced data table (DATA_TABLE_SPEC 10-point contract). */
export function DataTable<TData>({
  columns,
  data,
  total,
  state,
  getRowId,
  isLoading = false,
  isError = false,
  onRetry,
  filterBar,
  renderSubRow,
  renderMobileCard,
  bulkActions,
  onExport,
  meta,
  columnControls = false,
  emptyTitle = 'Kayıt bulunamadı',
  emptyDescription = 'Filtreleri değiştirin ya da yeni bir kayıt oluşturun.',
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({ left: [], right: [] });
  const [allMatching, setAllMatching] = React.useState(false);
  const dragCol = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting: state.sorting, rowSelection, columnVisibility, columnOrder, columnPinning },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.max(1, Math.ceil(total / state.pagination.pageSize)),
    getRowId,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableColumnPinning: columnControls,
    onSortingChange: state.setSorting,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      setAllMatching(false);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => Boolean(renderSubRow),
    ...(meta !== undefined ? { meta: meta as Record<string, unknown> } : {}),
  });

  /** Reorder columns by dropping the dragged header onto a target header. */
  const reorderColumn = (targetId: string) => {
    const from = dragCol.current;
    dragCol.current = null;
    if (!from || from === targetId) return;
    const order = table.getState().columnOrder.length
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().map((c) => c.id);
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, moved!);
    setColumnOrder(order);
  };

  const rows = table.getRowModel().rows;
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const clearSelection = () => {
    setRowSelection({});
    setAllMatching(false);
  };

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    enabled: rows.length > VIRTUAL_THRESHOLD,
  });

  const useVirtual = rows.length > VIRTUAL_THRESHOLD;
  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = useVirtual && virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    useVirtual && virtualItems.length > 0
      ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;
  const renderedRows = useVirtual ? virtualItems.map((vi) => rows[vi.index]!) : rows;

  const handleExport = (format: ExportFormat, scope: ExportScope) =>
    onExport?.(format, scope, { pageRows: data, selectedIds });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">{filterBar}</div>
        <div className="flex items-center gap-2">
          {/* Density + column controls only affect the desktop table (hidden below
              xl), so keep them off the tight phone toolbar where they'd be inert. */}
          <div className="hidden items-center gap-2 xl:flex">
            <DensityToggle />
            <ColumnVisibility table={table} enableControls={columnControls} />
          </div>
          {onExport && <ExportMenu selectedCount={selectedIds.length} onExport={handleExport} />}
        </div>
      </div>

      {selectedIds.length > 0 && bulkActions && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          total={total}
          allMatchingSelected={allMatching}
          onSelectAllMatching={() => setAllMatching(true)}
          onClear={clearSelection}
        >
          {bulkActions(selectedIds, allMatching, clearSelection)}
        </BulkActionBar>
      )}

      {isError ? (
        <ErrorState {...(onRetry ? { onRetry } : {})} />
      ) : isLoading ? (
        <LoadingRows columns={table.getVisibleFlatColumns().length} />
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* Desktop table */}
          <div
            ref={scrollRef}
            className="relative hidden max-h-[32rem] overflow-auto rounded-lg border border-border xl:block"
          >
            <table className="w-full caption-bottom text-sm" role="grid">
              <thead className="bg-muted/60 sticky top-0 z-10 backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const pin = pinnedCellProps(header.column);
                      const reorderable = columnControls && !header.isPlaceholder;
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                          style={{ width: header.getSize() !== 150 ? header.getSize() : undefined, ...pin.style }}
                          {...(reorderable
                            ? {
                                onDragOver: (e: React.DragEvent) => e.preventDefault(),
                                onDrop: () => reorderColumn(header.column.id),
                              }
                            : {})}
                          className={cn(
                            'text-muted-foreground relative h-11 whitespace-nowrap px-3 text-left align-middle font-medium',
                            pin.style.position ? 'bg-muted/60 z-20' : undefined,
                            pin.className,
                          )}
                        >
                          {reorderable && (
                            <button
                              type="button"
                              draggable
                              onDragStart={() => {
                                dragCol.current = header.column.id;
                              }}
                              onDragEnd={() => {
                                dragCol.current = null;
                              }}
                              aria-label="Kolonu taşımak için sürükle"
                              className="text-muted-foreground/50 hover:text-foreground relative mr-1 inline-flex cursor-grab align-middle outline-none after:absolute after:-inset-3 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                              data-action="drag-column"
                              data-entity="table"
                            >
                              <GripVertical className="size-3.5" />
                            </button>
                          )}
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              // Thin 1px visual grip, but a wider transparent hit
                              // zone (pseudo-element) so the resizer is graspable.
                              className="hover:bg-border absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none after:absolute after:inset-y-0 after:-left-5 after:right-0 after:content-['']"
                              aria-hidden="true"
                            />
                          )}
                          {/* Column filter funnel — LEFT of the label per design. */}
                          {!header.isPlaceholder && header.column.columnDef.meta?.filter && (
                            <ColumnHeaderFilter filter={header.column.columnDef.meta.filter} state={state} />
                          )}
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="hover:text-foreground -ml-1 inline-flex h-8 items-center gap-1 rounded px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              data-action="sort"
                              data-entity="table"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ArrowUp className="size-3.5" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="size-3.5" />
                              ) : (
                                <ChevronsUpDown className="size-3.5 opacity-40" />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr aria-hidden>
                    <td style={{ height: paddingTop }} colSpan={table.getVisibleFlatColumns().length} />
                  </tr>
                )}
                {renderedRows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                      className="border-t border-border data-[state=selected]:bg-accent/40 hover:bg-muted/40 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const pin = pinnedCellProps(cell.column);
                        return (
                          <td
                            key={cell.id}
                            className={cn('px-3 py-2 align-middle', pin.style.position ? 'z-10' : undefined, pin.className)}
                            style={{ height: ROW_HEIGHT, ...pin.style }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    {row.getIsExpanded() && renderSubRow && (
                      <tr className="bg-muted/30">
                        <td colSpan={row.getVisibleCells().length} className="px-3 py-3">
                          {renderSubRow(row.original)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {paddingBottom > 0 && (
                  <tr aria-hidden>
                    <td style={{ height: paddingBottom }} colSpan={table.getVisibleFlatColumns().length} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 xl:hidden">
            {rows.map((row) => {
              const selected = row.getIsSelected();
              const toggle = () => row.toggleSelected();
              return (
                <div key={row.id} className="bg-card rounded-lg border border-border p-3">
                  {renderMobileCard ? (
                    renderMobileCard(row.original, selected, toggle)
                  ) : (
                    <dl className="grid grid-cols-2 gap-1 text-sm">
                      {row.getVisibleCells().map((cell) => (
                        <div key={cell.id} className="col-span-2 flex justify-between gap-2">
                          <dt className="text-muted-foreground">
                            {typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id}
                          </dt>
                          <dd className="text-right">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <DataTablePagination
        page={state.pagination.pageIndex + 1}
        pageSize={state.pagination.pageSize}
        total={total}
        selectedCount={allMatching ? total : selectedIds.length}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
      />
    </div>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {/* Desktop table skeleton (xl+) */}
      <div className="hidden overflow-hidden rounded-lg border border-border xl:block">
        <div className="bg-muted/60 h-11 border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
            {Array.from({ length: Math.min(columns || 5, 6) }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
      {/* Mobile card skeleton (below xl) — shape-matched to MobileListCard. */}
      <div className="space-y-2 xl:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card flex items-start gap-3 rounded-lg border border-border p-3">
            <Skeleton className="mt-1 size-4 shrink-0 rounded-[4px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
