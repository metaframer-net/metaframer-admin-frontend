import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useLocation, useMatches } from 'react-router-dom';
import { MoreHorizontal, X } from 'lucide-react';

import { type NavItem } from '@/config/nav-schema';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { hasRouteMeta } from '@/app/route-meta';
import { useFeatureFlag } from '@/lib/settings/feature-flags-store';
import { CommandCenter } from './CommandCenter';
import { DockLogo } from './DockLogo';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { usePermittedNav, isNavItemActive } from './nav-utils';
import { useCommandPalette } from './command-palette-context';

/** How many top-level modules the hover strip shows before an overflow chip. */
const INLINE_NAV_LIMIT = 6;

/** Live-clock refresh — an HH:mm readout needs no finer tick. */
const CLOCK_TICK_MS = 30_000;

/**
 * How long the collapsed panel stays mounted after `open` flips to false. Must
 * cover the collapse transition (`--duration-base`, the faster exit) so the panel
 * is seen folding back into the pill instead of vanishing; it is `inert`
 * throughout. Exits are quicker than entrances: the user has already decided.
 */
const PANEL_EXIT_MS = 180;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(value);
}

/**
 * Clock behind the status chip. A supplied `now` freezes it (deterministic
 * stories, tests and visual snapshots); otherwise it ticks live and the interval
 * is only created when it is actually needed.
 */
function useDockClock(now: Date | undefined): Date {
  const [tick, setTick] = useState(() => now ?? new Date());
  useEffect(() => {
    if (now) return;
    const id = window.setInterval(() => setTick(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, [now]);
  return now ?? tick;
}

/**
 * Inline module strip for the engaged pill. A SINGLE highlight (the "ink") slides
 * between the dots and the highlighted dot unfolds its label — the motion lives in
 * the `.dock-dot*` rules in theme.css. The highlight is sticky: `highlighted` is
 * cleared only when the pointer leaves the strip or focus moves out, so travelling
 * between two dots is one continuous glide instead of the previous per-dot
 * collapse/expand (which read as the strip jumping).
 *
 * Dot widths and the ink's transform/width are set imperatively from measured
 * label widths, so both interpolate in lockstep. Clicking a dot opens the command
 * center; the strip is a preview and never navigates on its own.
 */
function DockNavStrip({
  items,
  overflowCount,
  pathname,
  onOpen,
}: {
  items: NavItem[];
  overflowCount: number;
  pathname: string;
  onOpen: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const inkRef = useRef<HTMLLIElement>(null);
  // Whether the ink is currently shown (a dot is highlighted). Drives the
  // "place instantly on first appearance, glide only while already visible" rule
  // below, so the ink fades in AT the hovered dot instead of sliding in from x:0.
  const inkShownRef = useRef(false);
  // The ink's current left offset — the "from" point for the distance-aware glide
  // duration (how far it must travel to the next dot).
  const inkXRef = useRef(0);
  // The width animates on an inner clip wrapper, NOT the button: the button must
  // stay un-clipped so its `before:-inset-1.5` 44px hit-area expander is not
  // swallowed by `overflow: hidden`.
  const clipRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const labelWidths = useRef<number[]>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  // Collapsed dots are the icon box; the highlighted dot is icon + its label's
  // natural width (the label's own trailing `pr-3` is part of that measurement).
  // The ink is placed from the same running offset, so it and the dot widen together.
  const ICON = 32; // size-8 glyph box
  const GAP = 12; // gap-3 between dots
  // Distance-aware glide: a base duration plus a per-pixel term, clamped. Pure
  // travel/speed would peg almost every move to the floor at this scale (dots are
  // ~44px apart, the whole strip ~220px), so the base + slope spreads a perceptible
  // gradient across the real range — a neighbour hop stays quick, a sweep across
  // the strip takes noticeably longer, so the ink reads as one consistent speed.
  const GLIDE_BASE_MS = 190;
  const GLIDE_PER_PX = 0.8;
  const GLIDE_MIN_MS = 210;
  const GLIDE_MAX_MS = 380;
  // Grace window before a strip-exit collapses the ink (see `select`/`scheduleCollapse`).
  const COLLAPSE_GRACE_MS = 140;

  // Hover hysteresis: entering any dot selects it AND cancels a pending collapse;
  // leaving the strip only SCHEDULES a collapse. A long label's reflow can nudge a
  // dot out from under a stationary pointer for a frame or two — without this grace
  // window that momentary exit would collapse the whole strip and re-open on the
  // next dot ("can't catch it" / open-close flicker, worst near the last dots + the
  // overflow chip where the reflow shift is largest).
  const collapseTimer = useRef<number | null>(null);
  const select = useCallback((i: number) => {
    if (collapseTimer.current !== null) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setHighlighted(i);
  }, []);
  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current !== null) clearTimeout(collapseTimer.current);
    collapseTimer.current = window.setTimeout(() => {
      collapseTimer.current = null;
      setHighlighted(null);
    }, COLLAPSE_GRACE_MS);
  }, []);
  useEffect(
    () => () => {
      if (collapseTimer.current !== null) clearTimeout(collapseTimer.current);
    },
    [],
  );

  const measure = useCallback(() => {
    labelWidths.current = labelRefs.current.map((el) => el?.scrollWidth ?? 0);
  }, []);

  const applyLayout = useCallback(() => {
    const ink = inkRef.current;
    const list = listRef.current;
    // First appearance = the ink was hidden and a dot just became highlighted.
    // Then it must land at the target WITHOUT a transition (fade in in place);
    // once visible, moving between dots glides via the stylesheet transition.
    const appearing = highlighted !== null && !inkShownRef.current;
    let left = 0;
    clipRefs.current.forEach((clip, i) => {
      if (!clip) return;
      const expanded = i === highlighted;
      const width = expanded ? ICON + (labelWidths.current[i] ?? 0) : ICON;
      clip.style.width = `${width}px`;
      if (expanded && ink) {
        // Scale the glide duration to the travel distance (constant-ish speed).
        // Skipped while appearing (placed instantly) — no travel to pace.
        if (list) {
          if (appearing) {
            list.style.removeProperty('--dock-glide');
          } else {
            const dist = Math.abs(left - inkXRef.current);
            const dur = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, GLIDE_BASE_MS + dist * GLIDE_PER_PX));
            list.style.setProperty('--dock-glide', `${dur}ms`);
          }
        }
        if (appearing) ink.style.transition = 'none';
        ink.style.transform = `translateX(${left}px)`;
        ink.style.width = `${width}px`;
        if (appearing) {
          void ink.offsetWidth; // flush the jump-free placement…
          ink.style.transition = ''; // …then hand motion back to the stylesheet
        }
        inkXRef.current = left;
      }
      left += width + GAP;
    });
    // Back at rest: let the collapse use the default relaxed duration.
    if (highlighted === null) list?.style.removeProperty('--dock-glide');
    inkShownRef.current = highlighted !== null;
  }, [highlighted]);

  useLayoutEffect(() => {
    measure();
    applyLayout();
  }, [measure, applyLayout]);

  // Latest applyLayout, so the subscribe-once effect below always calls the current
  // one WITHOUT re-subscribing on every highlight change. Re-subscribing would make
  // the already-resolved `fonts.ready` re-fire each render and re-run applyLayout
  // with the ink already at its target (dist 0) — which would clobber the
  // distance-aware `--dock-glide` back to the floor after every move.
  const applyRef = useRef(applyLayout);
  useLayoutEffect(() => {
    applyRef.current = applyLayout;
  }, [applyLayout]);

  // Re-measure when the viewport or the loaded webfont changes label widths.
  useEffect(() => {
    const recompute = () => {
      measure();
      applyRef.current();
    };
    window.addEventListener('resize', recompute);
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) recompute();
    });
    return () => {
      live = false;
      window.removeEventListener('resize', recompute);
    };
  }, [measure]);

  return (
    <nav aria-label="Hızlı gezinme" className="dock-reveal dock-reveal-nav">
      <div className="flex items-center">
        <span className="bg-glass-border/70 mx-1.5 h-5 w-px shrink-0" aria-hidden />
        {/* gap-3 so each 44px hit area (size-8 dot + before:-inset-1.5) stays
            non-overlapping — WCAG 2.5.8 / the project's 44px touch-target rule. */}
        <ul
          ref={listRef}
          className="relative flex items-center gap-3"
          data-dock-strip
          data-active={highlighted !== null ? 'true' : 'false'}
          onPointerLeave={scheduleCollapse}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleCollapse();
          }}
        >
          {/* The one shared highlight — slides + resizes to the highlighted dot. An
              `<li>` (not a bare span) keeps the `<ul>` content model valid; it is
              `position: absolute` so it never joins the flex flow, and `aria-hidden`
              removes it from the list's item count. */}
          <li ref={inkRef} className="dock-dot-ink" aria-hidden />
          {items.map((item, i) => {
            const active = isNavItemActive(item.to, pathname);
            const Icon = item.icon;
            return (
              <li key={item.id}>
                {/* Clicking a dot opens the command center (it does NOT navigate) —
                    the strip is a preview; navigation happens inside the panel. On
                    hover/focus the dot expands rightward to reveal the module name.
                    `before:-inset-1.5` keeps a 44px hit area around the 32px glyph. */}
                <button
                  type="button"
                  onClick={onOpen}
                  onPointerEnter={() => select(i)}
                  onFocus={() => select(i)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  data-highlighted={i === highlighted ? 'true' : 'false'}
                  className={cn(
                    // `overflow-hidden` lives on the inner clip span, NOT here, so the
                    // `before:-inset-1.5` 44px hit-area expander is never clipped.
                    'dock-dot focus-visible:ring-ring relative z-[1] inline-flex h-8 items-center rounded-full outline-none before:absolute before:-inset-1.5 before:content-[""] active:scale-[0.94] focus-visible:ring-2 motion-reduce:active:scale-100',
                    // A tint, not a filled block — the sliding ink carries the hover
                    // highlight; the active page keeps its own persistent tint.
                    active
                      ? 'bg-primary/15 text-primary'
                      : i === highlighted
                        ? 'text-glass-foreground'
                        : 'text-muted-foreground',
                  )}
                  data-action="open-command-palette"
                  data-entity={item.aiEntity ?? 'module'}
                >
                  {/* Inner clip wrapper — the animated width lives here; it clips the
                      unfolding label while the button's box (and its hit-area
                      pseudo-element) stays intact. */}
                  <span
                    ref={(el) => {
                      clipRefs.current[i] = el;
                    }}
                    className="dock-dot-clip flex h-8 items-center overflow-hidden rounded-full"
                  >
                    <span className="grid size-8 shrink-0 place-items-center">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span
                      ref={(el) => {
                        labelRefs.current[i] = el;
                      }}
                      aria-hidden
                      className="dock-dot-label shrink-0 whitespace-nowrap pr-3 text-xs font-medium"
                    >
                      {item.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {overflowCount > 0 && (
            <li>
              {/* The overflow chip is a FULL participant in the sliding highlight
                  (index `items.length`, label-less so it stays icon-width): moving
                  onto it slides the ink here instead of collapsing it. That kills
                  the "close then re-open" flicker when the pointer crosses from the
                  last module onto the chip — and when a long label's reflow nudges
                  the chip under a stationary pointer. */}
              <button
                type="button"
                onClick={onOpen}
                onPointerEnter={() => select(items.length)}
                onFocus={() => select(items.length)}
                data-highlighted={items.length === highlighted ? 'true' : 'false'}
                className={cn(
                  'dock-dot focus-visible:ring-ring relative z-[1] inline-flex h-8 items-center rounded-full outline-none before:absolute before:-inset-1.5 before:content-[""] active:scale-[0.94] focus-visible:ring-2 motion-reduce:active:scale-100',
                  items.length === highlighted ? 'text-glass-foreground' : 'text-muted-foreground',
                )}
                aria-label={`${overflowCount} modül daha — komut merkezini aç`}
                data-action="open-command-palette"
                data-entity="command"
              >
                <span
                  ref={(el) => {
                    clipRefs.current[items.length] = el;
                  }}
                  className="dock-dot-clip grid size-8 shrink-0 place-items-center overflow-hidden rounded-full"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export interface CommandDockProps {
  /**
   * Freezes the status chip's clock. Supplied by stories/tests for deterministic
   * output; in the app the dock ticks on its own.
   */
  now?: Date | undefined;
  className?: string;
}

/**
 * Floating command dock — the chrome-light nav surface for `dock` mode, and a
 * three-stage pill:
 *
 * 1. COLLAPSED — brand mark + the ACTIVE page (icon + label) + ⌘K.
 * 2. ENGAGED (hover or keyboard focus-within) — the pill widens and the inline
 *    nav strip plus the live status chip spring out of it.
 * 3. OPEN — the pill KEEPS its top row and the command center unfolds INSIDE it:
 *    the surface rounds from a capsule, grows downward and the panel's own height
 *    animates open. One continuous surface — never a separate centered modal.
 *
 * The open panel is a modal dialog: a backdrop covers the page, focus moves to
 * the close control and is trapped, Escape and backdrop clicks dismiss, and the
 * page behind is scroll-locked. Below `xl` the dock is hidden and
 * `CommandCardLauncher` hosts the very same `CommandCenter` body in a dialog.
 */
export function CommandDock({ now, className }: CommandDockProps) {
  const { open, setOpen, source } = useCommandPalette();
  const notificationsEnabled = useFeatureFlag('notificationCenter');
  const nav = usePermittedNav();
  const { pathname } = useLocation();
  const matches = useMatches();
  const inlineItems = nav.slice(0, INLINE_NAV_LIMIT);
  const overflow = nav.length - inlineItems.length;
  const time = formatTime(useDockClock(now));

  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The dock is now the SINGLE host at every breakpoint (the old mobile island is
  // gone), so the panel opens whenever the palette is open — desktop or mobile.
  const panelOpen = open;

  // ⌘K and Escape drive this surface dozens of times a day, and an unfold on a
  // keyboard action reads as lag rather than polish — so those transitions play
  // instantly. The flag clears as soon as the pointer touches the dock again, so
  // hover keeps its motion.
  const [instant, setInstant] = useState(false);
  const [lastPanelOpen, setLastPanelOpen] = useState(panelOpen);
  if (lastPanelOpen !== panelOpen) {
    setLastPanelOpen(panelOpen);
    setInstant(source === 'keyboard');
  }

  // Mount on open (adjusted during render, so the panel is in the DOM for the
  // very first frame of the unfold), and stay mounted through the collapse so
  // the fold-back is visible. Unmounting on the way out is what resets the
  // panel to its card grid for the next open.
  const [rendered, setRendered] = useState(panelOpen);
  if (panelOpen && !rendered) setRendered(true);
  useEffect(() => {
    if (panelOpen) return;
    const id = window.setTimeout(() => setRendered(false), PANEL_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [panelOpen]);

  // Modal contract: opening moves focus into the dialog…
  useEffect(() => {
    if (panelOpen) closeRef.current?.focus();
  }, [panelOpen]);

  // …and closing hands it back to the pill rather than dropping it on <body>.
  const wasOpen = useRef(panelOpen);
  useEffect(() => {
    const previously = wasOpen.current;
    wasOpen.current = panelOpen;
    if (!previously || panelOpen) return;
    const active = document.activeElement;
    if (active === null || active === document.body || panelRef.current?.contains(active)) {
      pillRef.current?.focus();
    }
  }, [panelOpen]);

  // Scroll-lock the page behind the open panel; both values are restored exactly.
  useEffect(() => {
    if (!panelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [panelOpen]);

  // Escape and the focus trap live on the dock's own key handler — not on
  // `document` — so they only fire while focus is inside the dock, and never
  // steal the key from a layer above.
  const onKeyDown = (e: KeyboardEvent) => {
    // A layer inside the panel (a popover, a menu) gets first refusal on the key.
    if (!panelOpen || e.nativeEvent.isComposing || e.defaultPrevented) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false, 'keyboard');
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable || focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    const inside = panelRef.current?.contains(active) === true;
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  };

  // Active page for the collapsed pill: precise route title (same source as the
  // breadcrumbs) for the label, and the matching module's icon for the glyph.
  // The full trail feeds the status chip's accessible name — the pill itself only
  // has room for the last step.
  const activeItem = nav.find((i) => isNavItemActive(i.to, pathname));
  const trail: string[] = [];
  let contextEntity: string | undefined;
  for (const match of matches) {
    if (!hasRouteMeta(match.handle)) continue;
    trail.push(match.handle.routeMeta.title);
    // Deepest matched route wins — it is the page the user is actually on.
    contextEntity = match.handle.routeMeta.aiEntity;
  }
  // The pill shows ONLY the current page (leaf) — a full breadcrumb trail here
  // overflows the chrome once it deepens. The accessible name below still carries
  // the whole path for assistive tech; the on-page breadcrumbs carry it visually.
  const activeLabel = trail.at(-1) ?? activeItem?.label ?? 'Panel';

  return (
    <>
      {/* Backdrop — dims and de-focuses the page the panel floats over. Mounted
          with the panel so it can fade back out. */}
      {rendered && (
        <div
          className={cn(
            'bg-scrim fixed inset-0 z-30 backdrop-blur-sm transition-opacity duration-[var(--duration-slow)]',
            panelOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'dock-pill bg-glass text-glass-foreground border-glass-border fixed left-1/2 top-3 z-40 flex -translate-x-1/2 flex-col border shadow-lg backdrop-blur-md',
          className,
        )}
        data-open={panelOpen ? 'true' : 'false'}
        data-instant={instant ? 'true' : undefined}
        aria-label="Komut çubuğu"
        data-entity="dock"
        onKeyDown={onKeyDown}
        onPointerMove={() => {
          if (instant) setInstant(false);
        }}
      >
        {/* ── Stage 1/2: the pill row. Stays put when the panel opens. ── */}
        {/* The ENTIRE pill surface is one open/close toggle — click anywhere on the
            chrome (logo, brand, status, clock, gaps, dividers, nav strip) to open,
            click again to close. The two EXCEPTIONS own their own clicks and never
            toggle the panel: the notification bell and the profile menu (their
            wrapper carries `data-dock-exclude`). Child controls that already
            toggle/open on their own (the brand button, the nav dots) are left to
            their handler so this never double-fires. The keyboard path stays the
            real brand button below, so this adds no second tab stop. */}
        <div
          className="flex items-center gap-2 px-2 py-1.5"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-dock-exclude]') || target.closest('button')) return;
            setOpen(!open);
          }}
        >
          <div className="flex min-w-0 flex-1 items-center">
            <button
              ref={pillRef}
              type="button"
              onClick={() => setOpen(!open)}
              className="hover:bg-glass-foreground/10 inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-sm font-medium outline-none transition-[background-color,scale] duration-[var(--duration-fast)] active:scale-[0.97] motion-reduce:active:scale-100"
              aria-label={`arsam.net · Şu an: ${trail.length > 0 ? trail.join(' › ') : activeLabel}, saat ${time} — menü ve komut aramayı aç`}
              aria-keyshortcuts="Meta+K Control+K"
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              data-action="open-command-palette"
              data-entity="command"
            >
              <DockLogo className="size-7 shrink-0" />
              {/* Brand text is desktop-only. On desktop the verbose status (page,
                  clock, ⌘K) is decluttered out of the collapsed state and springs
                  back on hover/focus; on mobile (coarse pointer) the reveal is
                  always open, so "Şu an: {page}" is the resting label. The clock and
                  ⌘K stay desktop-only so the mobile pill never crams. The accessible
                  NAME (below) carries the full "Şu an: … saat …" reading regardless. */}
              <span className="hidden shrink-0 font-semibold tracking-tight xl:inline">
                arsam.net
              </span>
              {/* Desktop: brand-led resting pill; the verbose status (page · clock ·
                  ⌘K) springs out of the `.dock-reveal` on hover/focus. Wrapped in a
                  plain `hidden xl:block` span so it never fights the mobile status. */}
              <span className="hidden xl:block">
                <span className="dock-reveal">
                  {/* `whitespace-nowrap`: while the reveal grid animates 0fr→1fr the
                      content is clipped; without nowrap a long page name ("Pipeline
                      Raporları") wraps and overlaps itself mid-animation. */}
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="bg-success size-1.5 shrink-0 rounded-full" aria-hidden />
                    <span className="text-muted-foreground shrink-0">Şu an:</span>
                    <span className="font-semibold">{activeLabel}</span>
                    <span className="bg-glass-border/70 h-3.5 w-px shrink-0" aria-hidden />
                    <span className="text-muted-foreground shrink-0 font-mono text-[0.6875rem] tabular-nums tracking-wide">
                      {time}
                    </span>
                    <kbd className="bg-background/40 text-muted-foreground border-glass-border pointer-events-none ml-0.5 shrink-0 select-none rounded border px-1.5 font-mono text-[0.625rem]">
                      ⌘K
                    </kbd>
                  </span>
                </span>
              </span>
              {/* Mobile: a tight, left-aligned status (natural width, no `flex-1`
                  gap). "Şu an:" is dropped below 360px so the whole module name fits
                  at 320; the title truncates only when it genuinely can't fit. */}
              <span className="flex min-w-0 items-center gap-1.5 xl:hidden">
                <span className="bg-success size-1.5 shrink-0 rounded-full" aria-hidden />
                <span className="text-muted-foreground hidden shrink-0 text-xs min-[360px]:inline">
                  Şu an:
                </span>
                <span className="min-w-0 truncate text-sm font-semibold">{activeLabel}</span>
              </span>
            </button>

            {/* Inline module dots — desktop only (the mobile pill stays a clean
                logo + status). `hidden xl:contents` keeps the strip out of the flow
                below xl without disturbing its layout at xl. The track collapses to
                0fr and springs back on hover/focus; it is suppressed while the panel
                is open, where the card grid supersedes it. */}
            <div className="hidden xl:contents">
              <DockNavStrip
                items={inlineItems}
                overflowCount={overflow}
                pathname={pathname}
                onOpen={() => setOpen(true)}
              />
            </div>
          </div>

          {/* Thin divider, then the controls. Notifications stay in the resting
              pill; the user menu joins the hover/focus reveal so the collapsed
              state is brand + bell only. On coarse pointers the pill starts
              engaged (theme.css), so the menu is never hover-trapped on touch. */}
          {/* Divider is desktop-only — on the narrow mobile pill it just steals room
              the status title needs. */}
          <Separator orientation="vertical" className="bg-glass-border/60 h-6 max-xl:hidden" />
          {/* Bell + profile are the two exceptions to the click-anywhere toggle:
              they own their clicks (notifications popover / user menu) and must not
              open or close the command panel. */}
          {/* Bell + profile use a GLASS hover (not the teal `accent` ghost default,
              which reads as a jarring filled box on the glass chrome). */}
          <div className="flex shrink-0 items-center gap-1" data-dock-exclude>
            {notificationsEnabled && (
              <NotificationBell className="hover:bg-glass-foreground/10 hover:text-glass-foreground focus-visible:ring-0 focus-visible:border-transparent" />
            )}
            <span className="dock-reveal">
              <span>
                <UserMenu className="hover:bg-glass-foreground/10 hover:text-glass-foreground focus-visible:ring-0 focus-visible:border-transparent" />
              </span>
            </span>
          </div>
        </div>

        {/* ── Stage 3: the panel, unfolding inside the same surface. The height
            animates via the 0fr→1fr grid row, so it grows from the pill's edge to
            the content's own height without measuring it. ── */}
        <div className="dock-panel">
          <div>
            {rendered && (
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Komut merkezi"
                inert={!panelOpen}
                tabIndex={-1}
                onMouseDown={(e) => {
                  // Clicking dead space inside the panel must not drop focus on
                  // <body> — the panel would stop receiving Escape and Tab.
                  if (!(e.target as HTMLElement).closest(FOCUSABLE)) panelRef.current?.focus();
                }}
                className="border-glass-border/60 flex max-h-[calc(100dvh-7rem)] min-h-0 flex-col border-t outline-none"
              >
                {/* No title (removed per spec) — just the close control, right-aligned. */}
                <div className="flex flex-none items-center justify-end px-3 pb-1 pt-2">
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="dock-close hover:bg-glass-foreground/10 hover:text-glass-foreground text-muted-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none"
                    aria-label="Kapat"
                    data-action="close-command-palette"
                    data-entity="command"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <CommandCenter onClose={() => setOpen(false)} contextEntity={contextEntity} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
