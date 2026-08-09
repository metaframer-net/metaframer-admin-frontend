import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { LiquidDock, LiquidDockFilters, type DockTab } from '@/components/liquid-dock';
import { usePrimaryNav, isNavItemActive } from './nav-utils';
import { useCommandPalette } from './command-palette-context';
import { useEdgeDockScrim } from './edge-dock-scrim';

export type DockEdge = 'bottom' | 'left' | 'right';

/* How close (px) the pointer must get to the collapsed hint before the dock opens. */
const PROXIMITY = 12;

/** Only mouse/pen triggers proximity open — touch has its own tap path. */
function isHoveringPointer(e: PointerEvent): boolean {
  return e.pointerType !== 'touch';
}

interface EdgeShell {
  /** Wrapper anchor at the edge. */
  wrapper: string;
  /** Hint BUTTON hit box (≥44px cross-axis) — holds the focus ring; never fades. */
  hintBox: string;
  /** Visible slim glass bar inside the button — pulses collapsed, fades when open. */
  hintBar: string;
  /** Stage placement adjacent to the hint (no gap — avoids a hover dead zone). */
  stagePos: string;
  /** Stage transform when open vs collapsed (slides in from the edge). */
  stageOpen: string;
  stageClosed: string;
  origin: string;
  /** Heartbeat phase-offset so the edges don't pulse in unison (token-scaled). */
  pulseDelay: string;
  /** Capsule padding — thin across the rail, generous along it. */
  padding: string;
  label: string;
}

const SHELL: Record<DockEdge, EdgeShell> = {
  bottom: {
    wrapper: 'bottom-1 left-1/2 -translate-x-1/2',
    // 44px hit box; the visible tab is a clear ~20px rounded bar at the edge.
    hintBox: 'min-h-11 w-28 items-end justify-center',
    hintBar: 'h-6 w-28 rounded-t-2xl',
    // Stage anchored AT the edge (not above the 44px hit box) so the open dock sits
    // right by the tab with no gap; it just slides up + fades in.
    stagePos: 'bottom-0 left-1/2',
    stageOpen: '-translate-x-1/2 scale-100 opacity-100',
    stageClosed: '-translate-x-1/2 scale-x-100 scale-y-0 opacity-0',
    origin: 'origin-bottom',
    pulseDelay: 'calc(var(--stagger-step) * 6)',
    padding: 'px-2 py-1.5',
    label: 'alt',
  },
  left: {
    wrapper: 'left-1 top-1/2 -translate-y-1/2',
    hintBox: 'min-w-11 h-28 items-center justify-start',
    hintBar: 'h-28 w-6 rounded-r-2xl',
    stagePos: 'left-0 top-1/2',
    stageOpen: '-translate-y-1/2 scale-100 opacity-100',
    stageClosed: '-translate-y-1/2 scale-x-0 scale-y-100 opacity-0',
    origin: 'origin-left',
    pulseDelay: 'calc(var(--stagger-step) * 12)',
    padding: 'px-1.5 py-2',
    label: 'sol',
  },
  right: {
    wrapper: 'right-1 top-1/2 -translate-y-1/2',
    hintBox: 'min-w-11 h-28 items-center justify-end',
    hintBar: 'h-28 w-6 rounded-l-2xl',
    stagePos: 'right-0 top-1/2',
    stageOpen: '-translate-y-1/2 scale-100 opacity-100',
    stageClosed: '-translate-y-1/2 scale-x-0 scale-y-100 opacity-0',
    origin: 'origin-right',
    pulseDelay: 'calc(var(--stagger-step) * 24)',
    padding: 'px-1.5 py-2',
    label: 'sağ',
  },
};

/** Liquid glass stage for all edges — renders the LiquidDock with route navigation. */
function LiquidEdgeStage({ edge, onNavigate }: { edge: DockEdge; onNavigate: () => void }) {
  const primary = usePrimaryNav(5);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { setOpen: setPaletteOpen } = useCommandPalette();

  const tabs: DockTab[] = useMemo(() => [
    ...primary.map((item) => ({
      id: item.id,
      label: item.label.split(' ')[0]!,
      icon: item.icon,
    })),
    { id: '__search', label: 'Ara', icon: Search },
  ], [primary]);

  const activeIdx = primary.findIndex((item) => isNavItemActive(item.to, pathname));

  const handleSelect = (idx: number) => {
    const navItem = primary[idx];
    if (navItem) {
      navigate(navItem.to);
    } else {
      setPaletteOpen(true);
      onNavigate(); // palette opens immediately, close dock
    }
    // For nav items: don't close yet — onSettled will close after spring rests
  };

  const isVertical = edge === 'left' || edge === 'right';

  return (
    <div
      className="m-1"
      style={isVertical
        ? { height: 'min(400px, 70vh)', overflow: 'visible' }
        : { width: 'calc(100vw - 26px)', maxWidth: 500 }
      }
    >
      <LiquidDockFilters />
      <LiquidDock
        tabs={tabs}
        activeIndex={activeIdx >= 0 ? activeIdx : 0}
        onSelect={handleSelect}
        onSettled={onNavigate}
        orientation={isVertical ? 'vertical' : 'horizontal'}
        side={edge === 'left' ? 'left' : edge === 'right' ? 'right' : undefined}
      />
    </div>
  );
}

/**
 * A collapsible edge navigation dock (dock layout, desktop AND mobile). Collapsed it is
 * a small rich-glass hint tab hugging the edge; hover / keyboard-focus / tap flies the
 * dock in on the spring curve. It stays COLLAPSED at rest on purpose: up to three of
 * these frame the viewport, and three standing rails would wall the content in.
 * The revealed dock is a macOS-style magnifying dock on all three edges — icons grow
 * toward the cursor, the capsule grows with them, and a circular lens slides onto the
 * icon under the pointer. Each edge is independently flag-gated from Settings; all
 * share one nav source (usePrimaryNav). Golden Rule 1: reinterpreted in OUR glass +
 * motion tokens — NOT a clone of the reference's liquid-glass chrome.
 */
export function EdgeDock({ edge }: { edge: DockEdge }) {
  const cfg = SHELL[edge];
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Set while we programmatically move focus back to the hint on Escape, so the hint's
  // own focus handler does not re-open the dock during that restore.
  const suppressOpenRef = useRef(false);
  // Read inside the window mousemove / blur handlers without re-subscribing them each
  // render: a live mirror of `open`, and whether the pointer is within the proximity zone.
  const openRef = useRef(false);
  const nearRef = useRef(false);
  const stageId = `edge-dock-stage-${edge}`;

  // Shared scrim: report this ear's open state up, and close when the shared scrim
  // (or another ear's close-all) fires. One backdrop covers all ears, so the page
  // never darkens more than once no matter how many are open.
  const { reportOpen, closeToken } = useEdgeDockScrim();

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    reportOpen(edge, open);
  }, [edge, open, reportOpen]);

  // Clear this ear from the shared "any open" set if it unmounts (flag turned off).
  useEffect(() => () => reportOpen(edge, false), [edge, reportOpen]);

  // A tap on the shared scrim bumps the token; close in response (skip the initial 0).
  const firstCloseToken = useRef(closeToken);
  useEffect(() => {
    if (closeToken !== firstCloseToken.current) setOpen(false);
  }, [closeToken]);

  // Proximity open/close: open when the pointer approaches within PROXIMITY px of the
  // hint (or, while open, the revealed panel), and close when it moves beyond that zone —
  // unless keyboard focus is still inside. This only READS the pointer position (no
  // invisible overlay), so it never blocks clicks on the content underneath. Touch and
  // keyboard paths are unaffected (a tap fires no hovering pointermove).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const within = (r: DOMRect, x: number, y: number) =>
      x >= r.left - PROXIMITY &&
      x <= r.right + PROXIMITY &&
      y >= r.top - PROXIMITY &&
      y <= r.bottom + PROXIMITY;
    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (!isHoveringPointer(e)) return;
      const now = performance.now();
      if (now - last < 40) return; // throttle the getBoundingClientRect reads
      last = now;
      let near = within(wrapper.getBoundingClientRect(), e.clientX, e.clientY);
      if (!near && openRef.current && stageRef.current) {
        near = within(stageRef.current.getBoundingClientRect(), e.clientX, e.clientY);
      }
      nearRef.current = near;
      if (near) setOpen(true);
      else if (!wrapper.contains(document.activeElement)) setOpen(false);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const closeIfOutside = (next: Element | null) => {
    if (!wrapperRef.current?.contains(next) && !nearRef.current) setOpen(false);
  };

  return (
    // The backdrop lives in EdgeDockScrimProvider (one shared scrim for all ears).
    <div
      ref={wrapperRef}
      className={cn('fixed z-30', cfg.wrapper)}
      onBlur={(e) => closeIfOutside(e.relatedTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          // Close AND restore focus to the hint — but guard the hint's focus handler so
          // it does not re-open the dock (otherwise Escape is a no-op once focus has
          // tabbed into the tiles). The focus fires synchronously inside this window.
          suppressOpenRef.current = true;
          setOpen(false);
          wrapperRef.current?.querySelector<HTMLButtonElement>('[data-slot="edge-dock-hint"]')?.focus();
          suppressOpenRef.current = false;
        }
      }}
      data-entity="dock"
      data-slot="edge-dock"
      data-edge={edge}
    >
      {/* Collapsed hint — a 44px hit box (holds the focus ring, never fades so the ring
          stays visible on keyboard focus) wrapping a slim visible glass bar. The bar
          pulses (heartbeat) while collapsed and fades out when open so no grey tab
          lingers behind the dock. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={stageId}
        aria-label={`Gezinme dock’u (${cfg.label}) — aç`}
        onClick={() => setOpen(true)}
        onFocus={() => {
          if (!suppressOpenRef.current) setOpen(true);
        }}
        className={cn(
          'focus-visible:ring-ring group flex rounded-md outline-none focus-visible:ring-2',
          cfg.hintBox,
        )}
        data-slot="edge-dock-hint"
        data-action="toggle-edge-dock"
      >
        <span
          aria-hidden="true"
          style={{ animationDelay: cfg.pulseDelay }}
          className={cn(
            // Soft frosted LIGHT sliver: a low-opacity (/55) foreground fill over a
            // STRONG backdrop blur. Occlusion comes from the blur — text under the
            // collapsed hint smears into an unreadable frost — so we avoid both the
            // old bleed (`bg-glass-foreground/40`, no blur) and the stark near-white
            // slab that full opacity produced on the dark UI. The pulse is a `scale`
            // beat, so the frosting is unaffected by it.
            'bg-glass-foreground/55 group-hover:bg-glass-foreground/70 backdrop-blur-xl transition-colors',
            cfg.hintBar,
            cfg.origin, // pulse puffs inward from the edge, not half off-screen
            open ? 'opacity-0' : 'animate-pulse-soft opacity-100 motion-reduce:animate-none',
          )}
        />
      </button>

      {/* Stage — the revealed dock. Adjacent to the hint (no gap). `inert` when collapsed
          so its links stay out of the tab order + a11y tree while it fades. */}
      <div
        ref={stageRef}
        id={stageId}
        inert={!open}
        className={cn(
          'absolute transition-[scale,opacity] [transition-duration:var(--duration-reveal),var(--duration-base)] [transition-timing-function:var(--ease-emphasized),var(--ease-standard)] motion-reduce:transition-none',
          cfg.stagePos,
          cfg.origin,
          open ? cfg.stageOpen : cn('pointer-events-none', cfg.stageClosed),
        )}
      >
        <LiquidEdgeStage edge={edge} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}
