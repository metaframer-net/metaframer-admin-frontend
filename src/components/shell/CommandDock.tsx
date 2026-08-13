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
import { Scrim } from '@/components/ui/scrim';
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
 * Inline module strip for the engaged pill. The dots are FIXED icon slots that
 * never move or resize; a single "ink" slides behind the highlighted dot, and the
 * module name springs out SIDEWAYS in a pill placed BELOW the row. Because nothing
 * shifts, the pointer travels dot→dot without ever missing one, and the name never
 * covers the next icon. The highlight is sticky (a grace window survives the gaps
 * between dots). Clicking a dot opens the command center; the strip is a preview
 * and never navigates on its own. All motion lives in the `.dock-*` theme.css rules.
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
  const nameRef = useRef<HTMLSpanElement>(null);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Whether the ink/name are shown — drives "place instantly on first appearance,
  // glide only once already visible".
  const shownRef = useRef(false);
  const inkXRef = useRef(0);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  // Distance-aware glide so the ink's SPEED stays roughly constant: a hop to a
  // neighbour finishes quickly, a sweep across the strip takes longer.
  const GLIDE_BASE_MS = 190;
  const GLIDE_PER_PX = 0.8;
  const GLIDE_MIN_MS = 210;
  const GLIDE_MAX_MS = 380;
  const COLLAPSE_GRACE_MS = 140;

  // Hover hysteresis: entering a dot selects it AND cancels a pending collapse;
  // leaving the strip only SCHEDULES a collapse after a grace window, so crossing
  // the gap between two dots never flickers the highlight closed.
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

  const labelFor = useCallback(
    (i: number) => (i < items.length ? items[i]!.label : `${overflowCount} modül daha`),
    [items, overflowCount],
  );

  const applyLayout = useCallback(() => {
    const ink = inkRef.current;
    const list = listRef.current;
    const name = nameRef.current;
    if (highlighted === null) {
      if (name) name.dataset.shown = 'false';
      shownRef.current = false;
      return;
    }
    const dot = dotRefs.current[highlighted];
    if (!dot || !ink || !list) return;
    // First appearance = nothing was shown and a dot just became highlighted; then
    // the ink/name land at the target WITHOUT a transition (spring in place). Once
    // visible, moving between dots glides via the stylesheet transition.
    const appearing = !shownRef.current;
    const left = dot.offsetLeft;
    const width = dot.offsetWidth;

    // Distance-aware glide duration (skipped on first appearance — no travel).
    if (appearing) {
      list.style.removeProperty('--dock-glide');
    } else {
      const dist = Math.abs(left - inkXRef.current);
      const dur = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, GLIDE_BASE_MS + dist * GLIDE_PER_PX));
      list.style.setProperty('--dock-glide', `${dur}ms`);
    }

    // Ink — slides + resizes behind the FIXED dot (dot.offsetLeft is stable).
    if (appearing) ink.style.transition = 'none';
    ink.style.transform = `translateX(${left}px)`;
    ink.style.width = `${width}px`;
    if (appearing) {
      void ink.offsetWidth;
      ink.style.transition = '';
    }
    inkXRef.current = left;

    // Name — a pill under the highlighted dot, positioned relative to the pill (the
    // name's offsetParent), so it escapes the strip's reveal overflow clip.
    if (name) {
      const parent = name.offsetParent;
      if (parent instanceof HTMLElement) {
        const d = dot.getBoundingClientRect();
        const p = parent.getBoundingClientRect();
        // Slide OUT to the RIGHT of the icon (left edge just past the icon's right
        // edge), below the row — so it reads as unfolding rightward and never sits
        // on top of the icon.
        const nx = d.right - p.left + 4;
        const ny = d.bottom - p.top + 6;
        name.textContent = labelFor(highlighted);
        // Share the ink's glide so name + ink travel in lockstep.
        const glide = list.style.getPropertyValue('--dock-glide');
        if (glide) name.style.setProperty('--dock-glide', glide);
        else name.style.removeProperty('--dock-glide');
        if (appearing) {
          name.style.transition = 'none';
          name.style.transform = `translate(${nx}px, ${ny}px) scaleX(0.9)`;
          void name.offsetWidth;
          name.style.transition = '';
        }
        name.style.transform = `translate(${nx}px, ${ny}px) scaleX(1)`;
        name.dataset.shown = 'true';
      }
    }
    shownRef.current = true;
  }, [highlighted, labelFor]);

  useLayoutEffect(() => {
    applyLayout();
  }, [applyLayout]);

  // Re-place on resize / webfont load (both can move the dots), without
  // re-subscribing on every highlight change.
  const applyRef = useRef(applyLayout);
  useLayoutEffect(() => {
    applyRef.current = applyLayout;
  }, [applyLayout]);
  useEffect(() => {
    const recompute = () => applyRef.current();
    window.addEventListener('resize', recompute);
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) recompute();
    });
    return () => {
      live = false;
      window.removeEventListener('resize', recompute);
    };
  }, []);

  // Shared classes for every fixed icon dot (module + overflow chip). 44px hit
  // area via `before:-inset-1.5`; a tint marks the active page (the sliding ink
  // carries the hover highlight, so a filled block would double up).
  const dotClass = (i: number, active: boolean) =>
    cn(
      'dock-dot focus-visible:ring-ring relative z-[1] grid size-8 shrink-0 place-items-center rounded-full outline-none before:absolute before:-inset-1.5 before:content-[""] active:scale-[0.94] focus-visible:ring-2 motion-reduce:active:scale-100',
      active
        ? 'bg-primary/15 text-primary'
        : i === highlighted
          ? 'text-glass-foreground'
          : 'text-muted-foreground',
    );

  return (
    <>
      <nav aria-label="Hızlı gezinme" className="dock-reveal dock-reveal-nav">
        <div className="flex items-center">
          <span className="bg-glass-border/70 mx-1.5 h-5 w-px shrink-0" aria-hidden />
          {/* gap-3 so each 44px hit area (size-8 dot + before:-inset-1.5) stays
              non-overlapping — WCAG 2.5.8 / the project's 44px touch-target rule. */}
          <ul
            ref={listRef}
            className="dock-strip flex items-center gap-3"
            data-dock-strip
            data-active={highlighted !== null ? 'true' : 'false'}
            onPointerLeave={scheduleCollapse}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleCollapse();
            }}
          >
            {/* The sliding ink — an absolute `<li>` so it never joins the flex flow;
                `aria-hidden` keeps it out of the list's item count. */}
            <li ref={inkRef} className="dock-ink" aria-hidden />
            {items.map((item, i) => {
              const active = isNavItemActive(item.to, pathname);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  {/* Clicking a dot OPENS the command center (never navigates).
                      Hover/focus slides the ink here + springs the name out below. */}
                  <button
                    ref={(el) => {
                      dotRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={onOpen}
                    onPointerEnter={() => select(i)}
                    onFocus={() => select(i)}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    data-highlighted={i === highlighted ? 'true' : 'false'}
                    className={dotClass(i, active)}
                    data-action="open-command-palette"
                    data-entity={item.aiEntity ?? 'module'}
                  >
                    <Icon className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
            {overflowCount > 0 && (
              <li>
                <button
                  ref={(el) => {
                    dotRefs.current[items.length] = el;
                  }}
                  type="button"
                  onClick={onOpen}
                  onPointerEnter={() => select(items.length)}
                  onFocus={() => select(items.length)}
                  aria-label={`${overflowCount} modül daha — komut merkezini aç`}
                  data-highlighted={items.length === highlighted ? 'true' : 'false'}
                  className={dotClass(items.length, false)}
                  data-action="open-command-palette"
                  data-entity="command"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>
      {/* The module name lives OUTSIDE the reveal (a sibling of the strip's nav) so
          the reveal's overflow clip can't shave it; JS positions it under the
          highlighted dot. `aria-hidden` — each dot already carries its own label. */}
      <span ref={nameRef} className="dock-nav-name" aria-hidden />
    </>
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

  // The notification bell and the user menu are the two controls that live inside
  // the engaged-only reveal but open their OWN Radix layer (popover / dropdown).
  // That content portals to <body>, so once it opens the dock loses both `:hover`
  // and `:focus-within` and would collapse the reveal out from under the open
  // menu — detaching it and hiding its trigger. We track their open state and hold
  // the pill engaged (`data-hold`) until the menu closes; no panel is opened.
  const [heldBy, setHeldBy] = useState({ bell: false, user: false });
  const held = heldBy.bell || heldBy.user;

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

  // Modal contract: opening moves focus into the dialog — onto the "Ara… Sor…"
  // search so the user can type a query/command immediately (a command palette is
  // search-first). Falls back to the close control if the input isn't mounted.
  useEffect(() => {
    if (!panelOpen) return;
    const search = panelRef.current?.querySelector<HTMLInputElement>('#command-center-q');
    (search ?? closeRef.current)?.focus();
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
      {/* Backdrop — dims and de-focuses the page the panel floats over. Rendered at
          EVERY breakpoint: on mobile it both darkens the page behind the open island
          and catches an outside tap to dismiss (the pill sits above it at z-40, so
          tapping the pill still toggles). Previously `hidden xl:block` left mobile
          with no backdrop, so only the ✕ could close it and the page never dimmed. */}
      {rendered && (
        <Scrim open={panelOpen} onClick={() => setOpen(false)} zIndex={30} />
      )}

      <div
        className={cn(
          'dock-pill bg-glass text-glass-foreground border-glass-border fixed left-1/2 top-3 z-40 flex -translate-x-1/2 flex-col border shadow-lg backdrop-blur-md',
          className,
        )}
        data-open={panelOpen ? 'true' : 'false'}
        data-hold={held ? 'true' : undefined}
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
          className="flex items-stretch gap-2 pr-2"
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
              className="hover:bg-glass-foreground/10 inline-flex min-h-14 min-w-0 items-center gap-1.5 self-stretch rounded-full pl-0 pr-2.5 text-sm font-medium outline-none transition-[background-color,scale] duration-[var(--duration-fast)] active:scale-[0.97] motion-reduce:active:scale-100"
              aria-label={`example.net · Şu an: ${trail.length > 0 ? trail.join(' › ') : activeLabel}, saat ${time} — menü ve komut aramayı aç`}
              aria-keyshortcuts="Meta+K Control+K"
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              data-action="open-command-palette"
              data-entity="command"
            >
              <DockLogo className="size-14 shrink-0" />
              {/* Brand text is desktop-only. On desktop the verbose status (page,
                  clock, ⌘K) is decluttered out of the collapsed state and springs
                  back on hover/focus; on mobile (coarse pointer) the reveal is
                  always open, so "Şu an: {page}" is the resting label. The clock and
                  ⌘K stay desktop-only so the mobile pill never crams. The accessible
                  NAME (below) carries the full "Şu an: … saat …" reading regardless. */}
              <span className="hidden shrink-0 font-semibold tracking-tight xl:inline">
                example.net
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
              <NotificationBell
                className="hover:bg-glass-foreground/10 hover:text-glass-foreground focus-visible:ring-0 focus-visible:border-transparent"
                onOpenChange={(o) => setHeldBy((s) => ({ ...s, bell: o }))}
              />
            )}
            <span className="dock-reveal">
              <span>
                <UserMenu
                  className="hover:bg-glass-foreground/10 hover:text-glass-foreground focus-visible:ring-0 focus-visible:border-transparent"
                  onOpenChange={(o) => setHeldBy((s) => ({ ...s, user: o }))}
                />
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
