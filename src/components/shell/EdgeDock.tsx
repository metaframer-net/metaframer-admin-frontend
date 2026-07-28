import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Command, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { usePrimaryNav, isNavItemActive } from './nav-utils';
import { useCommandPalette } from './command-palette-context';

export type DockEdge = 'bottom' | 'left' | 'right';

/** A single dock target — a nav module link, or the ⌘K "all" action. */
interface DockItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  active: boolean;
  entity: string;
}

/* macOS-style magnification tuning (our own values). */
const BASE = 44; // icon box size (px) — meets the 44px touch-target rule at base scale
const GAP = 8;
const MIN = 1;
const MAX = 1.5;
const EFFECT = 170; // proximity falloff window along the main axis (px)
/* Dual-speed lerp (matches the GlassDock reference): quicker while the pointer drives
   the dock, softer as it eases back to rest. Applied per-frame in the rAF loop. */
const LERP_IN = 0.2;
const LERP_OUT = 0.12;
/* How close (px) the pointer must get to the collapsed hint before the dock opens — a
   proximity zone so you don't have to land exactly on the thin hint bar. */
const PROXIMITY = 64;

/** Resting center of icon i along the main axis (no magnification). */
function restCenter(i: number): number {
  return i * (BASE + GAP) + BASE / 2;
}

/** Cosine proximity falloff → per-icon scale for a given pointer position (or all
 * MIN when the pointer is away / null). */
function scalesFor(pos: number | null, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    if (pos === null) {
      out.push(MIN);
      continue;
    }
    const center = restCenter(i);
    const minX = pos - EFFECT / 2;
    const maxX = pos + EFFECT / 2;
    if (center < minX || center > maxX) {
      out.push(MIN);
      continue;
    }
    const theta = ((center - minX) / EFFECT) * 2 * Math.PI;
    const f = (1 - Math.cos(theta)) / 2;
    out.push(MIN + f * (MAX - MIN));
  }
  return out;
}

/** Icon center positions along the main axis, spaced by their (magnified) sizes. */
function positionsFromScales(scales: number[]): number[] {
  let run = 0;
  const out: number[] = [];
  for (const s of scales) {
    const w = BASE * s;
    out.push(run + w / 2);
    run += w + GAP;
  }
  return out;
}

/** Build the shared dock item list (permitted primary modules + ⌘K "all"). */
function useDockItems(): DockItem[] {
  const items = usePrimaryNav(5);
  const { pathname } = useLocation();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  return useMemo(
    () => [
      ...items.map((item) => ({
        key: item.id,
        label: item.label,
        icon: item.icon,
        to: item.to,
        active: isNavItemActive(item.to, pathname),
        entity: item.aiEntity ?? 'module',
      })),
      {
        key: 'command',
        label: 'Tümü (⌘K)',
        icon: Command,
        onClick: () => setPaletteOpen(true),
        active: false,
        entity: 'command',
      },
    ],
    [items, pathname, setPaletteOpen],
  );
}

/** True when the OS asks for reduced motion (magnification is then disabled). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** A single icon tile — a nav link or the ⌘K button. No background fill: the sliding
 * lens is the sole positional highlight, so nothing else "pops" a competing circle. */
function DockTile({
  item,
  edge,
  onNavigate,
}: {
  item: DockItem;
  edge: DockEdge;
  onNavigate?: (() => void) | undefined;
}) {
  const Icon = item.icon;
  // The always-on lens marks the icon nearest the cursor; while it is following the
  // pointer/keyboard focus elsewhere, the active route needs a NON-color cue too
  // (Golden Rule: color is never the sole signal). A tiny persistent dot on the outer
  // edge provides that — dock-idiomatic (macOS "running app" dot).
  const dotPos =
    edge === 'bottom'
      ? 'bottom-0.5 left-1/2 -translate-x-1/2'
      : edge === 'left'
        ? 'left-0.5 top-1/2 -translate-y-1/2'
        : 'right-0.5 top-1/2 -translate-y-1/2';
  const inner = (
    <>
      <Icon className="size-5" aria-hidden="true" />
      {item.active && (
        <span
          aria-hidden="true"
          className={cn('bg-primary pointer-events-none absolute size-1 rounded-full', dotPos)}
        />
      )}
    </>
  );
  const cls = cn(
    'focus-visible:ring-ring relative flex size-full items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2',
    item.active ? 'text-primary' : 'text-glass-foreground/80 hover:text-glass-foreground',
  );
  return item.to ? (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      aria-current={item.active ? 'page' : undefined}
      onClick={() => onNavigate?.()}
      className={cls}
      data-action="navigate"
      data-entity={item.entity}
    >
      {inner}
    </NavLink>
  ) : (
    <button
      type="button"
      aria-label={item.label}
      onClick={() => {
        item.onClick?.();
        onNavigate?.();
      }}
      className={cls}
      data-action="open-command-palette"
      data-entity={item.entity}
    >
      {inner}
    </button>
  );
}

/**
 * Magnifying dock for ALL three edges (bottom = horizontal, left/right = vertical).
 * macOS-style cosine magnification toward the cursor PLUS an always-visible "lens"
 * indicator that reinterprets the GlassDock reference: at rest it sits on the active
 * item; as the pointer moves it GLIDES to the nearest icon (its opacity never
 * animates — no "appearing" circle). A single requestAnimationFrame lerp loop drives
 * both the magnification and the lens glide (LERP_IN while pointing, LERP_OUT easing
 * back), so there is no stepped CSS-transition feel. The loop runs only while the dock
 * is in motion and cancels itself once settled. Under reduced-motion / touch (no
 * pointer) it is a calm static row: no magnify, and the lens snaps (no glide) to the
 * hovered or active item. Reinterpreted in OUR glass + tokens (Golden Rule 1/2).
 */
function MagnifyDock({
  items,
  onNavigate,
  edge,
}: {
  items: DockItem[];
  onNavigate?: (() => void) | undefined;
  edge: DockEdge;
}) {
  const axis: 'x' | 'y' = edge === 'bottom' ? 'x' : 'y';
  const reduced = usePrefersReducedMotion();
  // -1 when the current route matches no dock item — the lens then shows nothing at
  // rest (mirrors the old SideDock's "no highlight when nothing is active").
  const activeIdx = items.findIndex((i) => i.active);
  const count = items.length;
  const restExtent = count * (BASE + GAP) - GAP;

  const trackRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const trackEl = trackRef.current;
    const lensEl = lensRef.current;
    const tipEl = tipRef.current;
    if (!trackEl || !lensEl || !tipEl) return;
    // Re-bind to non-null-typed consts so the nested frame/paint closures (where
    // control-flow narrowing does not reach) see them as never-null.
    const track: HTMLDivElement = trackEl;
    const lens: HTMLSpanElement = lensEl;
    const tip: HTMLSpanElement = tipEl;
    const tiles = tileRefs.current;

    // Animated state, mutated in place across frames (no React re-render per frame).
    let scales: number[] = items.map(() => MIN);
    let lensCenter = restCenter(activeIdx >= 0 ? activeIdx : 0);
    let lensScale = activeIdx >= 0 ? MIN : 0;
    let pointer: number | null = null;
    let running = false;
    let raf = 0;

    /** Magnified centers for the current `scales`, re-centered so the group spills
     * evenly to both sides of the resting track instead of drifting one way. */
    function layout(): number[] {
      const p = positionsFromScales(scales);
      const lastP = p[p.length - 1] ?? 0;
      const lastS = scales[scales.length - 1] ?? MIN;
      const ext = p.length ? lastP + (BASE * lastS) / 2 : restExtent;
      const off = (restExtent - ext) / 2;
      return p.map((v) => v + off);
    }

    // Index of the icon whose (magnified) center is closest to pointer `p`.
    function nearest(centers: number[], p: number): number {
      let idx = 0;
      let best = Infinity;
      for (let i = 0; i < centers.length; i += 1) {
        const d = Math.abs((centers[i] ?? 0) - p);
        if (d < best) {
          best = d;
          idx = i;
        }
      }
      return idx;
    }

    function place(el: HTMLElement, center: number, scale: number) {
      if (axis === 'x') {
        el.style.left = `${center - BASE / 2}px`;
        el.style.bottom = '0';
        el.style.transformOrigin = '50% 100%';
      } else {
        el.style.top = `${center - BASE / 2}px`;
        if (edge === 'left') {
          el.style.left = '0';
          el.style.transformOrigin = '0% 50%';
        } else {
          el.style.right = '0';
          el.style.transformOrigin = '100% 50%';
        }
      }
      el.style.transform = `scale(${scale})`;
    }

    function paint(centers: number[]) {
      for (let i = 0; i < tiles.length; i += 1) {
        const t = tiles[i];
        if (!t) continue;
        const s = scales[i] ?? MIN;
        place(t, centers[i] ?? restCenter(i), s);
        t.style.zIndex = String(Math.round(s * 10));
      }
      place(lens, lensCenter, lensScale);
    }

    function showTip(idx: number, center: number) {
      const item = items[idx];
      if (!item) return;
      tip.textContent = item.label;
      tip.style.opacity = '1';
      if (axis === 'x') {
        tip.style.left = `${center}px`;
        tip.style.bottom = `${BASE + 12}px`;
        tip.style.transform = 'translateX(-50%)';
      } else {
        tip.style.top = `${center}px`;
        tip.style.transform = 'translateY(-50%)';
        if (edge === 'left') tip.style.left = `${BASE + 14}px`;
        else tip.style.right = `${BASE + 14}px`;
      }
    }
    function hideTip() {
      tip.style.opacity = '0';
    }

    function frame() {
      const k = pointer !== null ? LERP_IN : LERP_OUT;
      const wanted = scalesFor(pointer, count);
      let moving = false;
      for (let i = 0; i < count; i += 1) {
        const s = scales[i] ?? MIN;
        const w = wanted[i] ?? MIN;
        const next = s + (w - s) * k;
        if (Math.abs(w - next) > 0.001) moving = true;
        scales[i] = next;
      }
      const centers = layout();
      // Lens target: the hovered icon while pointing, else the active item — or NOTHING
      // (idx < 0) when the route matches no dock item, in which case the lens eases to
      // scale 0 (hidden) instead of falsely marking the first icon.
      const idx = pointer !== null ? nearest(centers, pointer) : activeIdx;
      const hasTarget = idx >= 0;
      const targetCenter = hasTarget ? (centers[idx] ?? restCenter(idx)) : lensCenter;
      const targetScale = hasTarget ? (scales[idx] ?? MIN) : 0;
      lensCenter += (targetCenter - lensCenter) * k;
      lensScale += (targetScale - lensScale) * k;
      if (Math.abs(targetCenter - lensCenter) > 0.3 || Math.abs(targetScale - lensScale) > 0.002) {
        moving = true;
      }
      paint(centers);
      if (pointer !== null && hasTarget) showTip(idx, targetCenter);
      else hideTip();
      // Reschedule ONLY while something is still animating. Once converged the painted
      // state is already correct, so we let the loop go idle even if the cursor is still
      // parked over the dock — a fresh mousemove/focusin calls ensureLoop() again. (Without
      // this, resting the pointer would spin rAF at 60fps forever, repainting identical
      // values on a persistent shell component.)
      if (moving) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function ensureLoop() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    /** Reduced-motion / touch: no magnify, no glide — the lens snaps to `idx`, or hides
     * (scale 0) when `idx < 0` (no active item). */
    function snap(idx: number) {
      scales = items.map(() => MIN);
      const centers = layout();
      if (idx >= 0) {
        lensCenter = restCenter(idx);
        lensScale = MIN;
      } else {
        lensScale = 0;
      }
      paint(centers);
      if (pointer !== null && idx >= 0) showTip(idx, lensCenter);
      else hideTip();
    }

    // Initial rest paint (pre-browser-paint via useLayoutEffect → no first-frame flash):
    // lens on the active item, or hidden when nothing is active.
    if (reduced) snap(activeIdx);
    else paint(layout());

    const onMove = (e: MouseEvent) => {
      const r = track.getBoundingClientRect();
      const p = axis === 'x' ? e.clientX - r.left : e.clientY - r.top;
      pointer = p;
      if (reduced) snap(nearest(layout(), p));
      else ensureLoop();
    };
    const onLeave = () => {
      pointer = null;
      if (reduced) snap(activeIdx);
      else ensureLoop();
    };
    // Keyboard: focusing a tile drives the same magnify/lens toward that icon, so
    // keyboard users get the identical positional cue + floating label as the mouse.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node;
      const idx = tiles.findIndex((t) => t?.contains(target));
      if (idx < 0) return;
      pointer = restCenter(idx);
      if (reduced) snap(idx);
      else ensureLoop();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (track.contains(e.relatedTarget as Node | null)) return;
      pointer = null;
      if (reduced) snap(activeIdx);
      else ensureLoop();
    };

    track.addEventListener('mousemove', onMove);
    track.addEventListener('mouseleave', onLeave);
    track.addEventListener('focusin', onFocusIn);
    track.addEventListener('focusout', onFocusOut);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener('mousemove', onMove);
      track.removeEventListener('mouseleave', onLeave);
      track.removeEventListener('focusin', onFocusIn);
      track.removeEventListener('focusout', onFocusOut);
    };
  }, [items, edge, axis, reduced, activeIdx, count, restExtent]);

  const trackStyle =
    axis === 'x'
      ? { width: restExtent, height: BASE }
      : { height: restExtent, width: BASE };

  return (
    <div ref={trackRef} className="relative" style={trackStyle}>
      {/* Always-on selection lens — decorative; the tiles carry the accessible names. */}
      <span
        ref={lensRef}
        aria-hidden="true"
        className="bg-glass-lens shadow-lens pointer-events-none absolute z-0 rounded-full"
        style={{ width: BASE, height: BASE }}
      />
      {/* Floating label for the icon nearest the cursor / keyboard focus. */}
      <span
        ref={tipRef}
        aria-hidden="true"
        className="bg-popover text-popover-foreground border-border pointer-events-none absolute z-50 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs opacity-0 shadow-md transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-standard)] motion-reduce:transition-none"
      />
      {items.map((item, i) => (
        <div
          key={item.key}
          ref={(el) => {
            tileRefs.current[i] = el;
          }}
          className="absolute"
          style={{ width: BASE, height: BASE }}
        >
          <DockTile item={item} edge={edge} onNavigate={onNavigate} />
        </div>
      ))}
    </div>
  );
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
  label: string;
}

const SHELL: Record<DockEdge, EdgeShell> = {
  bottom: {
    wrapper: 'bottom-1 left-1/2 -translate-x-1/2',
    // 44px hit box; the visible tab is a clear ~20px rounded bar at the edge.
    hintBox: 'min-h-11 w-24 items-end justify-center',
    hintBar: 'h-5 w-24 rounded-t-2xl',
    // Stage anchored AT the edge (not above the 44px hit box) so the open dock sits
    // right by the tab with no gap; it just slides up + fades in.
    stagePos: 'bottom-0 left-1/2',
    stageOpen: '-translate-x-1/2 translate-y-0 scale-100 opacity-100',
    stageClosed: '-translate-x-1/2 translate-y-4 scale-95 opacity-0',
    origin: 'origin-bottom',
    pulseDelay: 'calc(var(--stagger-step) * 6)',
    label: 'alt',
  },
  left: {
    wrapper: 'left-1 top-1/2 -translate-y-1/2',
    hintBox: 'min-w-11 h-24 items-center justify-start',
    hintBar: 'h-24 w-5 rounded-r-2xl',
    stagePos: 'left-0 top-1/2',
    stageOpen: '-translate-y-1/2 translate-x-0 scale-100 opacity-100',
    stageClosed: '-translate-y-1/2 -translate-x-4 scale-95 opacity-0',
    origin: 'origin-left',
    pulseDelay: 'calc(var(--stagger-step) * 12)',
    label: 'sol',
  },
  right: {
    wrapper: 'right-1 top-1/2 -translate-y-1/2',
    hintBox: 'min-w-11 h-24 items-center justify-end',
    hintBar: 'h-24 w-5 rounded-l-2xl',
    stagePos: 'right-0 top-1/2',
    stageOpen: '-translate-y-1/2 translate-x-0 scale-100 opacity-100',
    stageClosed: '-translate-y-1/2 translate-x-4 scale-95 opacity-0',
    origin: 'origin-right',
    pulseDelay: 'calc(var(--stagger-step) * 24)',
    label: 'sağ',
  },
};

/**
 * A collapsible edge navigation dock (dock layout, desktop AND mobile). Collapsed it is
 * a small rich-glass hint tab hugging the edge; hover / keyboard-focus / tap slides the
 * dock in. The revealed dock is a macOS-style magnifying dock on ALL three edges (icons
 * grow toward the cursor) with an always-on lens that glides to the hovered/active icon.
 * Up to three frame the viewport, each independently flag-gated from Settings; all share
 * one nav source (usePrimaryNav). Golden Rule 1: reinterpreted in OUR glass + motion
 * tokens — NOT a clone of the reference's liquid-glass chrome.
 */
export function EdgeDock({ edge }: { edge: DockEdge }) {
  const items = useDockItems();
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

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Proximity open/close: open when the pointer approaches within PROXIMITY px of the
  // hint (or, while open, the revealed panel), and close when it moves beyond that zone —
  // unless keyboard focus is still inside. This only READS the pointer position (no
  // invisible overlay), so it never blocks clicks on the content underneath. Touch and
  // keyboard paths are unaffected (no mousemove fires on touch).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const within = (r: DOMRect, x: number, y: number) =>
      x >= r.left - PROXIMITY &&
      x <= r.right + PROXIMITY &&
      y >= r.top - PROXIMITY &&
      y <= r.bottom + PROXIMITY;
    let last = 0;
    const onMove = (e: MouseEvent) => {
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
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const closeIfOutside = (next: Element | null) => {
    if (!wrapperRef.current?.contains(next) && !nearRef.current) setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={cn('fixed z-30', cfg.wrapper)}
      onMouseEnter={() => setOpen(true)}
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
            'bg-glass-foreground/40 group-hover:bg-glass-foreground/60 transition-opacity',
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
          'absolute transition-[transform,opacity] duration-[var(--duration-base)] ease-[var(--ease-standard)] motion-reduce:transition-none',
          cfg.stagePos,
          cfg.origin,
          open ? cfg.stageOpen : cn('pointer-events-none', cfg.stageClosed),
        )}
      >
        <nav
          aria-label={`Kenar gezinme (${cfg.label})`}
          className={cn(
            'bg-glass text-glass-foreground border-glass-border m-1 flex items-center rounded-full border shadow-lg backdrop-blur-md',
            edge === 'bottom' ? 'px-2 py-1.5' : 'px-1.5 py-2',
          )}
          style={{ overflow: 'visible' }}
        >
          <MagnifyDock items={items} onNavigate={() => setOpen(false)} edge={edge} />
        </nav>
      </div>
    </div>
  );
}
