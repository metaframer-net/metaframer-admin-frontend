import type { Table } from '@tanstack/react-table';
import { ArrowLeftToLine, ArrowRightToLine, Columns3, Pin, PinOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Column visibility picker driven by the TanStack Table instance. Each column
 * also exposes a keyboard-accessible submenu to pin (sticky-left) or move it
 * left/right — the accessible alternative to header drag-reorder
 * (DATA_TABLE_SPEC point 4). Both are unconditional: every table in the app
 * offers the same column controls.
 */
export function ColumnVisibility<TData>({ table }: { table: Table<TData> }) {
  const columns = table.getAllColumns().filter((c) => c.getCanHide());

  const move = (id: string, dir: -1 | 1) => {
    const order = table.getState().columnOrder.length
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().map((c) => c.id);
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j]!, order[i]!];
    table.setColumnOrder(order);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-action="open-column-visibility" data-entity="table">
          <Columns3 className="size-4" />
          <span className="hidden md:inline">Kolonlar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Görünür kolonlar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
            onSelect={(e) => e.preventDefault()}
          >
            {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Kolon düzeni</DropdownMenuLabel>
        {columns.map((column) => {
          const label = typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;
          const pinned = column.getIsPinned() === 'left';
          return (
            <DropdownMenuSub key={column.id}>
              <DropdownMenuSubTrigger>{label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    column.pin(pinned ? false : 'left');
                  }}
                  data-action={pinned ? 'unpin-column' : 'pin-column'}
                  data-entity="table"
                >
                  {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  {pinned ? 'Sabiti kaldır' : 'Sola sabitle'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    move(column.id, -1);
                  }}
                  data-action="move-column-left"
                  data-entity="table"
                >
                  <ArrowLeftToLine className="size-4" />
                  Sola taşı
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    move(column.id, 1);
                  }}
                  data-action="move-column-right"
                  data-entity="table"
                >
                  <ArrowRightToLine className="size-4" />
                  Sağa taşı
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
