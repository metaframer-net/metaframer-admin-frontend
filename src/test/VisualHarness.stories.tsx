import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  expectColumnsAligned,
  expectPinnedSeamFlush,
  freezeForSnapshot,
  snapshotAcrossViewports,
} from './visual';

/**
 * Reference harness for the visual/layout regression system (see `visual.ts` +
 * `breakpoints.ts`). NOT a product component — it exists so the test system has
 * a stable, self-contained subject and a copyable example of how a feature story
 * wires up alignment assertions + responsive snapshots. When you add these guards
 * to a real table, follow the `play` fn below.
 *
 * The mini-table is a DIV/CSS-grid table with a pinned first column — the exact
 * shape that shifts in practice (a native `<table>` auto-equalises column widths
 * across header/body, so it can't drift; div-grid tables like TanStack Table use
 * a separate width source per section and CAN, which is the reported bug). Header
 * and body share ONE grid template (`COLS`); desync them and the guard fails.
 */
const COLS = 'grid grid-cols-[48px_1fr_160px_120px]';

const ROWS = [
  { id: '1', name: 'Bahçelievler 3+1 Daire', price: '4.250.000 ₺', status: 'Yayında' },
  { id: '2', name: 'Kadıköy İşyeri', price: '9.800.000 ₺', status: 'Beklemede' },
  { id: '3', name: 'Çeşme Arsa', price: '12.500.000 ₺', status: 'Yayında' },
] as const;

function GridTable() {
  return (
    <div role="table" className="max-w-full overflow-x-auto p-4 text-sm text-foreground">
      <div role="rowgroup">
        <div role="row" className={`${COLS} border-b border-border`}>
          <div
            role="columnheader"
            data-testid="hcell"
            className="sticky left-0 z-10 bg-background p-3 font-medium"
          >
            <input type="checkbox" aria-label="Tümünü seç" />
          </div>
          <div role="columnheader" data-testid="hcell" className="p-3 font-medium">
            İlan
          </div>
          <div role="columnheader" data-testid="hcell" className="p-3 font-medium">
            Fiyat
          </div>
          <div role="columnheader" data-testid="hcell" className="p-3 font-medium">
            Durum
          </div>
        </div>
      </div>
      <div role="rowgroup">
        {ROWS.map((row, i) => {
          const testid = i === 0 ? 'bcell' : undefined;
          return (
            <div role="row" key={row.id} className={`${COLS} border-b border-border`}>
              <div
                role="cell"
                data-testid={testid}
                className="sticky left-0 z-10 bg-background p-3"
              >
                <input type="checkbox" aria-label={`${row.name} seç`} />
              </div>
              <div role="cell" data-testid={testid} className="p-3">
                {row.name}
              </div>
              <div role="cell" data-testid={testid} className="p-3 tabular-nums">
                {row.price}
              </div>
              <div role="cell" data-testid={testid} className="p-3">
                {row.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const meta = {
  title: 'Test/VisualHarness',
  component: GridTable,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GridTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The guard itself: header/body columns must stay aligned, the pinned seam flush,
 * and the whole table must match its pixel baseline at each DESIGN_SYSTEM viewport.
 */
export const VisualGuard: Story = {
  play: async () => {
    await freezeForSnapshot();

    const headerCells = document.querySelectorAll('[data-testid="hcell"]');
    const bodyCells = document.querySelectorAll('[data-testid="bcell"]');

    // Root-cause guards (deterministic geometry — no pixel baseline needed).
    expectColumnsAligned(headerCells, bodyCells);
    expectPinnedSeamFlush(headerCells[0]!, headerCells[1]!);

    // Symptom guard (pixel snapshot across the responsive viewport set).
    await snapshotAcrossViewports('visual-harness-pinned-table');
  },
};
