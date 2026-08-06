import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMatches } from 'react-router-dom';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useFeatureFlag } from '@/lib/settings/feature-flags-store';
import { hasRouteMeta } from '@/app/route-meta';
import { CommandDock } from './CommandDock';
import { CommandCenter } from './CommandCenter';
import { DockLogo } from './DockLogo';
import { EdgeDock } from './EdgeDock';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useCommandPalette } from './command-palette-context';

export interface DockShellProps {
  children: ReactNode;
  /** Injected clock for deterministic stories/tests (threaded to the dock). */
  now?: Date | undefined;
}

/**
 * `dock` layout — mobile Dynamic Island.
 *
 * ONE element always mounted at full viewport height. The visual morph between
 * pill (collapsed) and panel (expanded) is done EXCLUSIVELY with `clip-path` —
 * a GPU-composited property that never triggers layout. Height, width, padding,
 * border-radius are all constant; clip-path reveals or hides the surface.
 *
 * This guarantees:
 * - 60 fps animation (compositor-only, zero main-thread layout work)
 * - Stable flex constraints (CommandCenter scroll always works)
 * - No mount/unmount (no React reconciliation during animation)
 */
export function DockShell({ children, now }: DockShellProps) {
  const { open, setOpen } = useCommandPalette();
  const notificationsEnabled = useFeatureFlag('notificationCenter');
  const edgeBottom = useFeatureFlag('edgeDockBottom');
  const edgeLeft = useFeatureFlag('edgeDockLeft');
  const edgeRight = useFeatureFlag('edgeDockRight');

  const matches = useMatches();
  let contextEntity: string | undefined;
  for (const match of matches) {
    if (hasRouteMeta(match.handle)) contextEntity = match.handle.routeMeta.aiEntity;
  }

  const closeRef = useRef<HTMLButtonElement>(null);

  // backdrop-filter kills the clip-path GPU animation — disable it during
  // the 480ms morph, enable after via data-settled.
  const [settled, setSettled] = useState(!open);
  useEffect(() => {
    if (open) {
      setSettled(false);
      const id = setTimeout(() => setSettled(true), 520);
      return () => clearTimeout(id);
    }
    setSettled(false);
  }, [open]);

  // Deferred focus — two rAFs so the clip-path animation paints first.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => closeRef.current?.focus());
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Deferred scroll-lock — one rAF so overflow:hidden reflow doesn't
  // collide with the clip-path transition's first frame.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const id = requestAnimationFrame(() => {
      document.body.style.overflow = 'hidden';
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden">
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-[35] bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300 xl:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* ── Mobile Dynamic Island ──
          Always full height. clip-path is the ONLY animated property.
          Collapsed: clips to a 3.5rem pill at the top with round corners.
          Expanded:  clips to the full rectangle with 1.5rem radius. */}
      <div
        className="dock-island bg-glass text-glass-foreground border-glass-border fixed inset-x-4 top-3 z-40 flex h-[calc(100dvh-1.5rem)] flex-col border xl:hidden"
        data-settled={settled ? 'true' : undefined}
        style={{
          // Collapsed radius is 1.75rem (= half the 3.5rem pill height → fully round
          // ends, identical to the old 9999px which the browser capped anyway). The
          // OPEN radius is 1.5rem. Keeping both small means the clip-path morph stays
          // a clean rounded rectangle the whole way; the old 9999px→1.5rem interpolation
          // ballooned into an ugly capsule mid-animation that clipped the content.
          clipPath: open
            ? 'inset(0 0 0 0 round 1.5rem)'
            : 'inset(0 0 calc(100% - 3.5rem) 0 round 1.75rem)',
        }}
        aria-label={open ? 'Komut merkezi' : 'Komut çubuğu'}
        data-entity="dock"
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
      >
        {/* ── Pill row (collapsed state) ── */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 flex h-14 items-center gap-2 px-2 transition-opacity duration-150',
            open ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full pl-1.5 pr-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2"
            aria-label="Menü ve komut aramayı aç"
            aria-keyshortcuts="Meta+K Control+K"
            tabIndex={open ? -1 : 0}
            data-action="open-command-palette"
            data-entity="command"
          >
            <DockLogo className="size-8" />
            <span className="truncate">arsam</span>
            <Search className="text-muted-foreground ml-auto size-4 shrink-0" aria-hidden />
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            {notificationsEnabled && <NotificationBell />}
            <UserMenu />
          </div>
        </div>

        {/* ── Panel header (expanded state) ── */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center gap-2 px-4 transition-opacity duration-150',
            open ? 'opacity-100 delay-150' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <DockLogo className="size-8 shrink-0" />
            <span className="truncate text-sm font-semibold">Nereye gitmek istersin?</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="dock-close focus-visible:ring-ring flex size-11 items-center justify-center rounded-full outline-none transition-[background-color,transform] duration-[var(--duration-fast)] hover:bg-foreground/10 focus-visible:ring-2"
            aria-label="Kapat"
            tabIndex={open ? 0 : -1}
            data-action="close-command-palette"
            data-entity="command"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Command center body ──
            flex flex-col propagates the height constraint so CommandCenter's
            inner overflow-y-auto can scroll. */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col transition-opacity duration-200',
            open ? 'opacity-100 delay-200' : 'pointer-events-none opacity-0',
          )}
          aria-hidden={!open || undefined}
        >
          <CommandCenter
            onClose={() => setOpen(false)}
            contextEntity={contextEntity}
            className="min-h-0 flex-1"
          />
        </div>
      </div>

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
