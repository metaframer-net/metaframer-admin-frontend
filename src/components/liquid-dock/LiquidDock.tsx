import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessagesSquare,
  Search,
  type LucideIcon,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────── */

export interface DockTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type DockOrientation = 'horizontal' | 'vertical';

export interface LiquidDockProps {
  tabs?: DockTab[] | undefined;
  activeIndex?: number | undefined;
  onSelect?: ((idx: number) => void) | undefined;
  /** Called when the spring settles after a tab change (not on active-tab pulse). */
  onSettled?: (() => void) | undefined;
  /** Default: 'horizontal'. Vertical docks show icon-only with side tooltips. */
  orientation?: DockOrientation | undefined;
  /** For vertical: which side the dock sits on (tooltip direction). */
  side?: 'left' | 'right' | undefined;
}

/* ── Constants ───────────────────────────────────────────────────── */

const BAR_THICKNESS = 66;
const BAR_RADIUS = 33;
const LENS_BASE = 60;
const ICON_SIZE = 26;
const DOT_SIZE = 4;
// No fixed overhang constant — lens position derived from icon centre.

const LEAD_STIFFNESS = 420;
const LEAD_DAMPING = 32;
const LEAD_MASS = 1;

const TRAIL_STIFFNESS = 260;
const TRAIL_DAMPING = 30;
const TRAIL_MASS = 1;

const REDUCED_DURATION = 120;

/* ── Spring solver ───────────────────────────────────────────────── */

interface Edge { x: number; v: number; target: number; }

function stepEdge(e: Edge, dt: number, stiffness: number, damping: number, mass: number): Edge {
  const force = -stiffness * (e.x - e.target) - damping * e.v;
  const a = force / mass;
  return { x: e.x + (e.v + a * dt) * dt, v: e.v + a * dt, target: e.target };
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(lo: number, hi: number, t: number) {
  const x = clamp((t - lo) / (hi - lo), 0, 1);
  return x * x * (3 - 2 * x);
}
function tryHaptic() { try { navigator.vibrate?.(6); } catch { /* */ } }

function useMediaQuery(q: string, fallback = false) {
  return useSyncExternalStore(
    (cb) => { const mq = window.matchMedia(q); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => window.matchMedia(q).matches,
    () => fallback,
  );
}

/* ── Default tabs ────────────────────────────────────────────────── */

const DEFAULT_TABS: DockTab[] = [
  { id: 'dashboard', label: 'Genel',    icon: LayoutDashboard },
  { id: 'listings',  label: 'İlanlar',  icon: Building2 },
  { id: 'users',     label: 'Kişiler',  icon: Users },
  { id: 'messages',  label: 'Mesajlar', icon: MessagesSquare },
  { id: 'search',    label: 'Ara',      icon: Search },
];

/* ── Component ───────────────────────────────────────────────────── */

export function LiquidDock({
  tabs = DEFAULT_TABS,
  activeIndex = 0,
  onSelect,
  onSettled,
  orientation = 'horizontal',
  side,
}: LiquidDockProps) {
  const vert = orientation === 'vertical';
  const count = tabs.length;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const opaque = useMediaQuery('(prefers-reduced-transparency: reduce)');

  const barRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  const springRef = useRef<{
    start: Edge; end: Edge; currentActive: number; initialized: boolean;
  }>({ start: { x: 0, v: 0, target: 0 }, end: { x: 0, v: 0, target: 0 }, currentActive: activeIndex, initialized: false });

  const onSelectStable = useRef(onSelect);
  const onSettledStable = useRef(onSettled);
  useLayoutEffect(() => { onSelectStable.current = onSelect; onSettledStable.current = onSettled; });

  useLayoutEffect(() => {
    const bar = barRef.current;
    const lens = lensRef.current;
    const dot = dotRef.current;
    const tip = tipRef.current;
    if (!bar || !lens || !dot) return;

    const containers = iconRefs.current;
    const state = springRef.current;

    // Main-axis helpers (horizontal: width/x, vertical: height/y)
    function barMain() { return vert ? bar!.offsetHeight : bar!.offsetWidth; }
    function slotSize() { return barMain() / count; }
    function slotCenter(i: number) { return slotSize() * i + slotSize() / 2; }
    function slotStart(i: number) { return slotCenter(i) - LENS_BASE / 2; }
    function slotEnd(i: number) { return slotCenter(i) + LENS_BASE / 2; }

    let pointerDown = false;
    let dragStart = 0;
    let isDragging = false;
    let pressedOnActive = false;
    let hoveredIdx = -1;
    let running = false;
    let raf = 0;
    let lastTime = 0;
    let traveling = false; // true after a tab change, until spring settles
    let safetyTimer = 0;   // fallback if onRest never fires
    const DRAG_THRESHOLD = 8;

    // Must be declared before the activeIndex check below calls it
    function ensureLoop() { if (!running) { running = true; lastTime = 0; raf = requestAnimationFrame(frame); } }

    /** Snap springs to idx without animation (for init / resize). */
    function snapTo(idx: number) {
      state.start.x = slotStart(idx); state.start.target = state.start.x; state.start.v = 0;
      state.end.x = slotEnd(idx); state.end.target = state.end.x; state.end.v = 0;
      state.currentActive = idx;
    }

    // Hide lens until first measured paint — prevents flash at wrong position
    lens.style.opacity = '0';

    if (!state.initialized) {
      snapTo(activeIndex);
      state.initialized = true;
    }

    if (state.currentActive !== activeIndex) {
      state.start.target = slotStart(activeIndex);
      state.end.target = slotEnd(activeIndex);
      state.currentActive = activeIndex;
      ensureLoop();
    }

    // Deferred first paint: wait one rAF so layout is settled, then reveal lens
    const initRaf = requestAnimationFrame(() => {
      snapTo(state.currentActive);
      paintLens(); paintDot(); paintIcons();
      // Fade lens in after correct position is set
      lens.style.transition = 'opacity 150ms ease-out';
      lens.style.opacity = '1';
      // Clean up inline transition after fade completes
      setTimeout(() => { lens.style.transition = ''; }, 160);
    });

    function nearestSlot(pos: number) {
      const ss = slotSize();
      return clamp(Math.round((pos - ss / 2) / ss), 0, count - 1);
    }
    function setTarget(i: number) {
      state.start.target = slotStart(i);
      state.end.target = slotEnd(i);
    }

    /* ── Paint ── */

    /** Cross-axis centre of the icon (not the label) relative to bar edge.
     *  Horizontal: distance from bar bottom. Vertical: distance from bar left.
     *  Computed from known geometry — no DOM measurement needed. */
    function iconCrossCentre(): number {
      if (vert) {
        // No labels in vertical mode, icon centred in BAR_THICKNESS
        return BAR_THICKNESS / 2;
      }
      // Horizontal: icon + label + gap are centred in BAR_THICKNESS.
      // Label ~12px (10px font + line-height), gap 2px → stack ~40px.
      // Icon centre = BAR_THICKNESS/2 + (labelHeight + gap) / 2 from bottom.
      const LABEL_BLOCK = 14; // label height + gap
      return BAR_THICKNESS / 2 + LABEL_BLOCK / 2;
    }

    function paintLens() {
      const s = state.start.x;
      const e = state.end.x;
      const mainLen = Math.max(e - s, LENS_BASE * 0.5);
      // Volume compression on cross axis
      const ratio = clamp((LENS_BASE / mainLen) * 0.35 + 0.65, 0.88, 1);
      const cross = LENS_BASE * ratio;
      const radius = cross / 2;

      // Cross-axis: centre lens on the icon centre (measured, not hardcoded)
      const cc = iconCrossCentre();

      if (vert) {
        // main=Y, cross=X
        const crossLeft = cc - cross / 2;
        lens!.style.top = `${s}px`;
        lens!.style.bottom = '';
        // Position relative to the bar's side
        if (side === 'right') {
          lens!.style.right = `${BAR_THICKNESS - crossLeft - cross}px`;
          lens!.style.left = '';
        } else {
          lens!.style.left = `${crossLeft}px`;
          lens!.style.right = '';
        }
        lens!.style.width = `${cross}px`;
        lens!.style.height = `${mainLen}px`;
      } else {
        // main=X, cross=Y (cc is measured from bar bottom)
        const bottom = cc - cross / 2;
        lens!.style.left = `${s}px`;
        lens!.style.bottom = `${bottom}px`;
        lens!.style.top = '';
        lens!.style.right = '';
        lens!.style.width = `${mainLen}px`;
        lens!.style.height = `${cross}px`;
      }
      lens!.style.borderRadius = `${radius}px`;
    }

    function paintDot() {
      const cx = slotCenter(state.currentActive);
      if (vert) {
        dot!.style.top = `${cx}px`;
        dot!.style.transform = 'translateY(-50%)';
        dot!.style.left = side === 'left' ? '6px' : '';
        dot!.style.right = side === 'right' ? '6px' : '';
        dot!.style.bottom = '';
      } else {
        dot!.style.left = `${cx}px`;
        dot!.style.transform = 'translateX(-50%)';
        dot!.style.bottom = '8px';
        dot!.style.top = '';
        dot!.style.right = '';
      }
    }

    function paintIcons() {
      const s = state.start.x;
      const e = state.end.x;
      const ss = slotSize();

      for (let i = 0; i < count; i++) {
        const el = containers[i];
        if (!el) continue;
        const iStart = i * ss;
        const iEnd = (i + 1) * ss;
        const oL = Math.max(s, iStart);
        const oR = Math.min(e, iEnd);
        const overlap = Math.max(0, oR - oL) / ss;
        const fill = smoothstep(0.35, 0.8, overlap);

        const outline = el.querySelector<SVGElement>('[data-variant="outline"]');
        const filled = el.querySelector<SVGElement>('[data-variant="filled"]');
        if (outline) outline.style.opacity = String(1 - fill);
        if (filled) filled.style.opacity = String(fill);

        // Label (horizontal only) or tooltip trigger
        const label = el.querySelector<HTMLSpanElement>('[data-slot="label"]');
        if (label) {
          const op = 0.6 + 0.4 * fill;
          label.style.color = fill > 0.5 ? '#ffffff' : `rgba(255,255,255,${op})`;
          label.style.fontWeight = fill > 0.5 ? '600' : '400';
          label.style.textShadow = fill > 0.5 ? '0 0 8px rgba(255,255,255,0.3)' : 'none';
        }
      }

      // Vertical tooltip
      if (vert && tip) {
        const idx = hoveredIdx >= 0 ? hoveredIdx : (pointerDown ? nearestSlot((s + e) / 2) : -1);
        const tab = idx >= 0 ? tabs[idx] : null;
        if (tab) {
          const cy = slotCenter(idx);
          tip.textContent = tab.label;
          tip.style.opacity = '1';
          tip.style.top = `${cy}px`;
          tip.style.transform = 'translateY(-50%)';
          if (side === 'right') {
            tip.style.right = `${BAR_THICKNESS + 12}px`;
            tip.style.left = '';
          } else {
            tip.style.left = `${BAR_THICKNESS + 12}px`;
            tip.style.right = '';
          }
        } else if (tip) {
          tip.style.opacity = '0';
        }
      }
    }

    /* ── Frame ── */

    function frame(ts: number) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min((ts - lastTime) / 1000, 0.033);
      lastTime = ts;

      if (reducedMotion) {
        const k = Math.min(dt / (REDUCED_DURATION / 1000), 1);
        state.start.x += (state.start.target - state.start.x) * k;
        state.end.x += (state.end.target - state.end.x) * k;
        state.start.v = 0; state.end.v = 0;
      } else {
        const midT = (state.start.target + state.end.target) / 2;
        const midC = (state.start.x + state.end.x) / 2;
        const fwd = midT >= midC;
        if (fwd) {
          state.end = stepEdge(state.end, dt, LEAD_STIFFNESS, LEAD_DAMPING, LEAD_MASS);
          state.start = stepEdge(state.start, dt, TRAIL_STIFFNESS, TRAIL_DAMPING, TRAIL_MASS);
        } else {
          state.start = stepEdge(state.start, dt, LEAD_STIFFNESS, LEAD_DAMPING, LEAD_MASS);
          state.end = stepEdge(state.end, dt, TRAIL_STIFFNESS, TRAIL_DAMPING, TRAIL_MASS);
        }
      }

      const settled = !pointerDown
        && Math.abs(state.start.x - state.start.target) < 0.2
        && Math.abs(state.end.x - state.end.target) < 0.2
        && Math.abs(state.start.v) < 0.3 && Math.abs(state.end.v) < 0.3;

      if (settled) {
        state.start.x = state.start.target; state.end.x = state.end.target;
        state.start.v = 0; state.end.v = 0;
        // Fire onSettled when spring rests after a tab change
        if (traveling) {
          traveling = false;
          clearTimeout(safetyTimer);
          // Brief pause so the lens sits for a beat before panel closes
          setTimeout(() => { onSettledStable.current?.(); }, 120);
        }
      }

      paintLens(); paintDot(); paintIcons();

      if (!settled || pointerDown) raf = requestAnimationFrame(frame);
      else running = false;
    }

    paintLens(); paintDot(); paintIcons();

    /* ── Pointer ── */

    function localMain(e: PointerEvent) {
      const r = bar!.getBoundingClientRect();
      return vert ? clamp(e.clientY - r.top, 0, r.height) : clamp(e.clientX - r.left, 0, r.width);
    }

    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true; isDragging = false;
      const pos = localMain(e); dragStart = pos;
      bar.setPointerCapture(e.pointerId);
      const idx = nearestSlot(pos);
      pressedOnActive = idx === state.currentActive;
      if (pressedOnActive) { lens.style.transition = 'transform 80ms ease-out'; lens.style.transform = 'scale(0.96)'; }
    };

    const onPointerMove = (e: PointerEvent) => {
      const pos = localMain(e);
      if (!pointerDown) {
        if (e.pointerType !== 'touch') {
          const idx = nearestSlot(pos);
          if (idx !== hoveredIdx) { hoveredIdx = idx; setTarget(idx); ensureLoop(); }
        }
        return;
      }
      if (!isDragging && Math.abs(pos - dragStart) > DRAG_THRESHOLD) {
        isDragging = true; pressedOnActive = false;
        lens.style.transition = 'none'; lens.style.transform = '';
      }
      if (isDragging) {
        const half = LENS_BASE / 2;
        state.start.target = pos - half; state.end.target = pos + half;
        const idx = nearestSlot(pos);
        if (idx !== hoveredIdx) { hoveredIdx = idx; tryHaptic(); }
        ensureLoop();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointerDown) return;
      pointerDown = false;
      const pos = localMain(e);
      const idx = nearestSlot(pos);
      if (pressedOnActive) {
        // Pulse on active tab, then settle
        lens.style.transition = 'transform 120ms ease-out'; lens.style.transform = '';
        pressedOnActive = false;
        setTimeout(() => { onSettledStable.current?.(); }, 140);
        return;
      }
      // Tab change: start traveling, navigate immediately
      traveling = true;
      clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        // Safety: if spring never settles, fire onSettled anyway
        if (traveling) { traveling = false; onSettledStable.current?.(); }
      }, 600);
      setTarget(idx); state.currentActive = idx; hoveredIdx = idx; tryHaptic();
      onSelectStable.current?.(idx); ensureLoop();
      lens.style.transition = 'none'; lens.style.transform = '';
    };

    const onPointerLeave = () => {
      if (!pointerDown) { hoveredIdx = -1; setTarget(state.currentActive); ensureLoop();
        if (vert && tip) tip.style.opacity = '0';
      }
    };
    const onCtx = (e: Event) => e.preventDefault();
    const onResize = () => {
      snapTo(state.currentActive);
      paintLens(); paintDot(); paintIcons();
    };

    // ResizeObserver: catches bar resize from layout changes, breakpoints, keyboard
    const ro = new ResizeObserver(onResize);
    ro.observe(bar);

    // visualViewport: catches mobile address bar hide/show
    const vv = window.visualViewport;
    const onVVResize = () => onResize();
    vv?.addEventListener('resize', onVVResize);

    // Font loading: icon labels can shift icon centre once fonts load
    document.fonts.ready.then(() => {
      onResize();
    });

    bar.addEventListener('pointerdown', onPointerDown);
    bar.addEventListener('pointermove', onPointerMove);
    bar.addEventListener('pointerup', onPointerUp);
    bar.addEventListener('pointercancel', onPointerUp);
    bar.addEventListener('pointerleave', onPointerLeave);
    bar.addEventListener('contextmenu', onCtx);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(initRaf);
      clearTimeout(safetyTimer);
      ro.disconnect();
      vv?.removeEventListener('resize', onVVResize);
      bar.removeEventListener('pointerdown', onPointerDown);
      bar.removeEventListener('pointermove', onPointerMove);
      bar.removeEventListener('pointerup', onPointerUp);
      bar.removeEventListener('pointercancel', onPointerUp);
      bar.removeEventListener('pointerleave', onPointerLeave);
      bar.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('resize', onResize);
    };
  }, [count, activeIndex, tabs, reducedMotion, vert, side]);

  // Specular: mirror for right dock (light from centre outward)
  const specularAngle = side === 'right' ? 340 : 200;

  return (
    <div
      role="tablist"
      aria-label="Ana gezinme"
      className="relative"
      style={{
        ...(vert
          ? { width: BAR_THICKNESS + 4, height: '100%', overflow: 'visible' }
          : { width: '100%', height: BAR_THICKNESS + 20, overflow: 'visible' }),
      }}
    >
      {/* Lens */}
      <div
        ref={lensRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          width: LENS_BASE, height: LENS_BASE,
          borderRadius: LENS_BASE / 2, zIndex: 5, overflow: 'hidden',
          transformOrigin: 'center center',
          willChange: vert ? 'top, width, height, border-radius' : 'left, width, height, border-radius',
          backdropFilter: opaque ? 'none' : 'saturate(150%) brightness(1.06) url(#lens-refraction)',
          WebkitBackdropFilter: opaque ? 'none' : 'saturate(150%) brightness(1.06)',
          background: opaque ? '#2c2c2e' : 'rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.18)',
        }}
      >
        <div className="absolute inset-0" style={{
          borderRadius: 'inherit',
          background: `conic-gradient(from ${specularAngle}deg, rgba(255,255,255,0.28) 0deg, rgba(255,255,255,0.04) 90deg, transparent 180deg, rgba(255,255,255,0.06) 300deg, rgba(255,255,255,0.28) 360deg)`,
          mixBlendMode: 'overlay',
        }} />
      </div>

      {/* Vertical tooltip */}
      {vert && (
        <span
          ref={tipRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-50 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold opacity-0"
          style={{
            background: opaque ? '#2c2c2e' : 'rgba(30,30,30,0.75)',
            color: 'rgba(255,255,255,0.9)',
            backdropFilter: opaque ? 'none' : 'blur(8px)',
            WebkitBackdropFilter: opaque ? 'none' : 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'opacity 150ms ease-out',
          }}
        />
      )}

      {/* Glass bar */}
      <div
        ref={barRef}
        className="absolute"
        style={{
          ...(vert
            ? { width: BAR_THICKNESS, top: 0, bottom: 0, ...(side === 'right' ? { right: 0 } : { left: 0 }) }
            : { height: BAR_THICKNESS, left: 0, right: 0, bottom: 0 }),
          borderRadius: BAR_RADIUS, overflow: 'visible', touchAction: 'none', cursor: 'pointer',
          backdropFilter: opaque ? 'none' : 'blur(12px) saturate(170%) url(#dock-refraction)',
          WebkitBackdropFilter: opaque ? 'none' : 'blur(12px) saturate(170%)',
          background: opaque ? '#1c1c1e' : 'rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 32px rgba(0,0,0,0.45)',
        }}
      >
        <div
          className={`relative flex ${vert ? 'flex-col' : ''} ${vert ? 'w-full' : 'h-full'} items-center`}
          style={{ zIndex: 10, isolation: 'isolate', ...(vert ? { height: '100%' } : {}) }}
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = idx === activeIndex;
            return (
              <div
                key={tab.id}
                ref={(el) => { iconRefs.current[idx] = el; }}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                tabIndex={isActive ? 0 : -1}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-white/30"
                style={{
                  ...(vert ? { width: BAR_THICKNESS } : { height: BAR_THICKNESS }),
                  position: 'relative',
                }}
              >
                <div className="relative" style={{ width: ICON_SIZE, height: ICON_SIZE }}>
                  <Icon data-variant="outline" size={ICON_SIZE} strokeWidth={1.8}
                    style={{ position: 'absolute', inset: 0, color: 'rgba(255,255,255,0.72)', opacity: isActive ? 0 : 1, transition: 'none', pointerEvents: 'none' }} />
                  <Icon data-variant="filled" size={ICON_SIZE} strokeWidth={2.4} fill="currentColor"
                    style={{ position: 'absolute', inset: 0, color: '#ffffff', opacity: isActive ? 1 : 0, transition: 'none', pointerEvents: 'none' }} />
                </div>
                {/* Labels: horizontal only. Vertical uses side tooltip. */}
                {!vert && (
                  <span data-slot="label" style={{
                    fontSize: 10, lineHeight: 1, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    textShadow: isActive ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
                    transition: 'none', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none',
                  }}>
                    {tab.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <span ref={dotRef} aria-hidden="true" className="absolute"
          style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: '50%', background: '#fff', zIndex: 10 }} />
      </div>
    </div>
  );
}
