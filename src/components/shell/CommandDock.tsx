import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useMatches } from 'react-router-dom';
import { MoreHorizontal, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { hasRouteMeta } from '@/app/route-meta';
import { useFeatureFlag } from '@/lib/settings/feature-flags-store';
import { DOCK_DESKTOP_QUERY, useMediaQuery } from '@/lib/layout/use-media-query';
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
  const isDesktop = useMediaQuery(DOCK_DESKTOP_QUERY);
  const nav = usePermittedNav();
  const { pathname } = useLocation();
  const matches = useMatches();
  const inlineItems = nav.slice(0, INLINE_NAV_LIMIT);
  const overflow = nav.length - inlineItems.length;
  const time = formatTime(useDockClock(now));

  const panelTitleId = useId();
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The panel only exists on the desktop pill; below xl the dialog launcher owns
  // it, so the two never fight over focus, scroll lock or the Escape key.
  const panelOpen = open && isDesktop;

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
    const body = document.body.style.overflow;
    const root = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = body;
      document.documentElement.style.overflow = root;
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
  const activeLabel = trail.at(-1) ?? activeItem?.label ?? 'Panel';

  // Visible trail: from three steps up it elides to `first › … › last` so the chip
  // stays one line. The accessible name (below) always carries the full path.
  const visible = trail.length > 0 ? trail : [activeLabel];
  const statusTrail =
    visible.length > 2
      ? [
          { key: 'first', label: visible[0]!, muted: true },
          { key: 'elided', label: '…', muted: true },
          { key: 'last', label: visible[visible.length - 1]!, muted: false },
        ]
      : visible.map((label, index) => ({
          key: `${label}-${index}`,
          label,
          muted: index < visible.length - 1,
        }));

  return (
    <>
      {/* Backdrop — dims and de-focuses the page the panel floats over. Mounted
          with the panel so it can fade back out. */}
      {rendered && (
        <div
          className={cn(
            'bg-scrim fixed inset-0 z-30 hidden backdrop-blur-sm transition-opacity duration-[var(--duration-slow)] xl:block',
            panelOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'dock-pill bg-glass text-glass-foreground border-glass-border fixed left-1/2 top-3 z-40 hidden -translate-x-1/2 flex-col border shadow-lg backdrop-blur-md xl:flex',
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
              className="hover:bg-glass-foreground/10 focus-visible:ring-ring inline-flex min-h-11 min-w-0 max-w-[36rem] items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-sm font-medium outline-none transition-[background-color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
              aria-label={`arsam.net · Şu an: ${trail.length > 0 ? trail.join(' › ') : activeLabel}, saat ${time} — menü ve komut aramayı aç`}
              aria-keyshortcuts="Meta+K Control+K"
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              data-action="open-command-palette"
              data-entity="command"
            >
              <DockLogo className="size-7 shrink-0" />
              {/* Brand-led resting pill. The verbose status (where you are, the
                  clock, ⌘K) is decluttered out of the collapsed state and springs
                  back on hover or keyboard focus-within — the same reveal mechanism
                  the nav strip uses. The button's accessible NAME (below) still
                  carries the full "Şu an: … saat …" reading, so assistive tech and
                  the status contract are unaffected by the visual gating. */}
              <span className="shrink-0 font-semibold tracking-tight">arsam.net</span>
              <span className="dock-reveal">
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* A steady green dot marks it live — no pulse. */}
                  <span className="bg-success size-1.5 shrink-0 rounded-full" aria-hidden />
                  <span className="text-muted-foreground shrink-0">Şu an:</span>
                  <span className="flex min-w-0 items-center gap-1">
                    {statusTrail.map((step, index) => (
                      <span key={step.key} className="flex min-w-0 items-center gap-1">
                        {index > 0 && <span className="text-muted-foreground shrink-0">›</span>}
                        <span className={cn('truncate', step.muted ? 'text-muted-foreground' : 'font-semibold')}>
                          {step.label}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="bg-glass-border/70 h-3.5 w-px shrink-0" aria-hidden />
                  <span className="text-muted-foreground shrink-0 font-mono text-[0.6875rem] tabular-nums tracking-wide">
                    {time}
                  </span>
                  <kbd className="bg-background/40 text-muted-foreground border-glass-border pointer-events-none ml-0.5 shrink-0 select-none rounded border px-1.5 font-mono text-[0.625rem]">
                    ⌘K
                  </kbd>
                </span>
              </span>
            </button>

            {/* Inline module dots — the track collapses to 0fr and springs back to
                the strip's natural width on hover/focus. It is suppressed while the
                panel is open, where the card grid supersedes it. */}
            <nav aria-label="Hızlı gezinme" className="dock-reveal dock-reveal-nav">
              <div className="flex items-center">
                <span className="bg-glass-border/70 mx-1.5 h-5 w-px shrink-0" aria-hidden />
                {/* gap-3 so each 44px hit area (size-8 dot + before:-inset-1.5) stays
                    non-overlapping — WCAG 2.5.8 / the project's 44px touch-target rule. */}
                <ul className="flex items-center gap-3">
                  {inlineItems.map((item) => {
                    const active = isNavItemActive(item.to, pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        {/* Clicking a dot opens the command center (it does NOT navigate) —
                            the strip is a preview; navigation happens inside the panel.
                            On hover/focus the dot expands rightward to reveal the module
                            name (attached slide-out). `before:-inset-1.5` keeps a 44px hit
                            area around the collapsed 32px glyph. */}
                        <button
                          type="button"
                          onClick={() => setOpen(true)}
                          aria-label={item.label}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group/dot focus-visible:ring-ring relative inline-flex h-8 items-center rounded-full outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] before:absolute before:-inset-1.5 before:content-[""] active:scale-[0.94] focus-visible:ring-2 motion-reduce:active:scale-100',
                            // A tint, not a filled block — two saturated slabs
                            // side by side (launcher + active dot) read as noise.
                            active
                              ? 'bg-primary/15 text-primary'
                              : 'text-muted-foreground hover:bg-glass-foreground/10 hover:text-glass-foreground',
                          )}
                          data-action="open-command-palette"
                          data-entity={item.aiEntity ?? 'module'}
                        >
                          <span className="grid size-8 shrink-0 place-items-center">
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span
                            aria-hidden
                            className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity,padding] duration-[var(--duration-base)] ease-[var(--ease-emphasized)] group-hover/dot:max-w-32 group-hover/dot:pr-2.5 group-hover/dot:opacity-100 group-focus-visible/dot:max-w-32 group-focus-visible/dot:pr-2.5 group-focus-visible/dot:opacity-100"
                          >
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {overflow > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="text-muted-foreground hover:bg-glass-foreground/10 hover:text-glass-foreground focus-visible:ring-ring relative inline-flex size-8 items-center justify-center rounded-full outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] before:absolute before:-inset-1.5 before:content-[''] active:scale-[0.94] focus-visible:ring-2 motion-reduce:active:scale-100"
                        aria-label={`${overflow} modül daha — komut merkezini aç`}
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
          </div>

          {/* Thin divider, then the controls. Notifications stay in the resting
              pill; the user menu joins the hover/focus reveal so the collapsed
              state is brand + bell only. On coarse pointers the pill starts
              engaged (theme.css), so the menu is never hover-trapped on touch. */}
          <Separator orientation="vertical" className="bg-glass-border/60 h-6" />
          {/* Bell + profile are the two exceptions to the click-anywhere toggle:
              they own their clicks (notifications popover / user menu) and must not
              open or close the command panel. */}
          <div className="flex shrink-0 items-center gap-1" data-dock-exclude>
            {notificationsEnabled && <NotificationBell />}
            <span className="dock-reveal">
              <span>
                <UserMenu />
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
                aria-labelledby={panelTitleId}
                inert={!panelOpen}
                tabIndex={-1}
                onMouseDown={(e) => {
                  // Clicking dead space inside the panel must not drop focus on
                  // <body> — the panel would stop receiving Escape and Tab.
                  if (!(e.target as HTMLElement).closest(FOCUSABLE)) panelRef.current?.focus();
                }}
                className="border-glass-border/60 flex max-h-[calc(100dvh-7rem)] min-h-0 flex-col border-t outline-none"
              >
                <div className="flex flex-none items-center justify-between gap-3 px-5 pb-3 pt-4">
                  <h2 id={panelTitleId} className="text-lg font-semibold tracking-tight">
                    Nereye gitmek istersin?
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="dock-close hover:bg-glass-foreground/10 hover:text-glass-foreground focus-visible:ring-ring text-muted-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2"
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
