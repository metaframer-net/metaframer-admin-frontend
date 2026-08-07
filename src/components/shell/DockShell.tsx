import { type ReactNode } from 'react';

import { useFeatureFlag } from '@/lib/settings/feature-flags-store';
import { CommandDock } from './CommandDock';
import { EdgeDock } from './EdgeDock';

export interface DockShellProps {
  children: ReactNode;
  /** Injected clock for deterministic stories/tests (threaded to the dock). */
  now?: Date | undefined;
}

/**
 * `dock` layout shell.
 *
 * The floating {@link CommandDock} is now the SINGLE command surface at EVERY
 * breakpoint — a full-width pill on mobile, a centered pill on desktop. Its panel
 * unfolds INSIDE the pill to its own content height (grid-rows `0fr → 1fr`), so
 * there is no separate full-height mobile island any more: no clip-path border
 * seams, and no empty space below short content. Focus trap, scroll lock, Escape
 * and the backdrop all live in `CommandDock`.
 *
 * Optional edge nav docks flank the viewport (each feature-flag gated).
 */
export function DockShell({ children, now }: DockShellProps) {
  const edgeBottom = useFeatureFlag('edgeDockBottom');
  const edgeLeft = useFeatureFlag('edgeDockLeft');
  const edgeRight = useFeatureFlag('edgeDockRight');

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden">
      {/* Floating dock (xl+). */}
      <CommandDock now={now} />

      {edgeBottom && <EdgeDock edge="bottom" />}
      {edgeLeft && <EdgeDock edge="left" />}
      {edgeRight && <EdgeDock edge="right" />}

      <main className="flex-1 overflow-x-hidden p-4 pb-20 pt-20 xl:pb-6" data-density-scope>
        {children}
      </main>
    </div>
  );
}
