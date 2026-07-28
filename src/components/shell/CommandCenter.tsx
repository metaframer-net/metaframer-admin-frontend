import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHelp } from '@/components/form/FieldHelp';
import { useLayout } from '@/lib/layout/layout-context';
import { setAssistantOpen } from '@/lib/ai';
import { applyIntent, parseCommand, type Intent } from '@/lib/ai';
import { useSession } from '@/lib/permissions/permission-context';
import { usePermissionMatrix } from '@/lib/permissions/permission-store';
import { navSchema, type NavItem } from '@/config/nav-schema';
import { buildAssistantContext } from '@/components/ai/assistant-context';
import { filterNavByRole, isNavItemActive } from './nav-utils';

const KBD =
  'bg-muted text-muted-foreground border-border pointer-events-none inline-flex select-none items-center rounded border px-1 font-mono text-[0.625rem]';

const NL_EXAMPLES = [
  "İstanbul'da 500 m² üzeri bekleyen arsa",
  'kullanıcılara git',
  'aktif ilanları göster',
];

/** A plain left-click the browser would handle as an in-page navigation. */
function isUnmodifiedClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * Renders as a real `<Link>` when it navigates and as a `<button>` when it only
 * discloses a sub view — so navigation targets keep their link semantics
 * (middle-click, ⌘-click, "open in new tab", status-bar preview) while
 * disclosures stay buttons. Modified clicks are left to the browser and do NOT
 * dismiss the panel.
 */
function CardShell({
  to,
  onSelect,
  onNavigated,
  children,
  ...rest
}: {
  to?: string | undefined;
  onSelect: () => void;
  onNavigated: () => void;
  children: React.ReactNode;
  className?: string;
  'aria-current'?: 'page' | undefined;
  'aria-expanded'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  'data-action'?: string;
  'data-entity'?: string;
}) {
  if (to === undefined) {
    return (
      <button type="button" onClick={onSelect} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (!isUnmodifiedClick(e)) return;
        onNavigated();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

export interface CommandCenterProps {
  /** Dismisses the host surface (the inline dock panel or the mobile dialog). */
  onClose: () => void;
  /** Optional AI entity of the current route — sharpens NL command parsing. */
  contextEntity?: string | undefined;
  className?: string;
}

/**
 * Command center body — the "Nereye gitmek istersin?" surface. Two views share
 * one panel: a MODULE CARD GRID, and (for modules that own children) a SUB
 * NAVIGATION view where the other modules collapse into a peek strip and the
 * selected module's children take the grid. Below them sit two fixed strips:
 * `extras` (identity + quick commands) and `search` (the natural-language box).
 *
 * The NL box keeps the guardrail: it PROPOSES a navigate/filter intent that
 * applies only on the user's confirm; write-class (bulk) intents are handed off
 * to the AI assistant, which owns that confirm flow.
 *
 * Rendered inline by `CommandDock` (desktop, inside the pill) and inside a
 * Dialog by `CommandCardLauncher` (below xl) — one body, two hosts.
 */
export function CommandCenter({ onClose, contextEntity, className }: CommandCenterProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useSession();
  const matrix = usePermissionMatrix();
  const { toggleMode, setTheme, resolvedTheme } = useLayout();

  const modules = React.useMemo(
    () => filterNavByRole(navSchema, user.role, matrix),
    [user.role, matrix],
  );

  const parseCtx = React.useMemo(
    () => buildAssistantContext(user.role, matrix, contextEntity),
    [user.role, matrix, contextEntity],
  );

  const [selected, setSelected] = React.useState<string | null>(null);
  const [q, setQ] = React.useState('');
  const [nl, setNl] = React.useState('');
  const [intent, setIntent] = React.useState<Intent | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const query = q.toLocaleLowerCase('tr').trim();
  const filtered = query
    ? modules.filter((m) =>
        `${m.label} ${m.description ?? ''}`.toLocaleLowerCase('tr').includes(query),
      )
    : modules;

  // Searching is a grid-level action, so it always returns to the card view.
  const selectedModule = query ? undefined : modules.find((m) => m.id === selected);
  const showSub = Boolean(selectedModule);

  const stackRef = React.useRef<HTMLDivElement>(null);
  const gridLayerRef = React.useRef<HTMLDivElement>(null);
  const subLayerRef = React.useRef<HTMLDivElement>(null);
  const wantSearchFocus = React.useRef(false);
  const firstMeasure = React.useRef(true);

  // The grid ↔ sub port animates its height between the two views. Absolute
  // layers can't size their container, so the SHOWN layer is measured and its
  // height is written to the port; a ResizeObserver keeps it synced as the grid
  // filters, the theme flips, or the sub list changes. The first write skips the
  // transition, so the panel opens at its true height instead of growing from 0.
  React.useLayoutEffect(() => {
    const stack = stackRef.current;
    const shown = showSub ? subLayerRef.current : gridLayerRef.current;
    if (!stack || !shown) return;
    const sync = () => {
      if (firstMeasure.current) {
        stack.style.transition = 'none';
        stack.style.height = `${shown.scrollHeight}px`;
        void stack.offsetHeight; // flush, so re-enabling can't animate this write
        stack.style.transition = '';
        firstMeasure.current = false;
        return;
      }
      stack.style.height = `${shown.scrollHeight}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(shown);
    return () => ro.disconnect();
  }, [showSub, selectedModule?.id, query, filtered.length]);

  // Returning to the grid parks focus on the search field — but the grid layer is
  // `inert` while the sub view shows, so the focus must wait for the switch to
  // commit rather than fire inside the (now-unmounting) back button's handler.
  // useLayoutEffect (not useEffect): the back button unmounts in this same commit,
  // dropping focus to <body>; recapturing it in the synchronous pre-paint phase
  // means that body-focus frame is never painted.
  React.useLayoutEffect(() => {
    if (showSub || !wantSearchFocus.current) return;
    wantSearchFocus.current = false;
    searchRef.current?.focus();
  }, [showSub]);

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  /** A module with children opens its sub view; a leaf navigates straight away. */
  const openModule = (mod: NavItem) => {
    if (mod.children && mod.children.length > 0) setSelected(mod.id);
    else go(mod.to);
  };

  const runParse = () => setIntent(parseCommand(nl, parseCtx));

  const applyProposed = async (i: Intent) => {
    if (i.kind === 'bulk-action') {
      // Write-class intent — hand off to the AI assistant's confirm flow.
      setAssistantOpen(true);
      onClose();
      return;
    }
    await applyIntent(i, { confirmed: true, onNavigate: go });
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Two-level port: the module grid slides out to the left as a disclosed
            module's sub view slides in from the right, and the port's height
            interpolates between them (see .pc-stack in theme.css). */}
        <div ref={stackRef} className="pc-stack">
          {/* ── Grid layer — search + module cards. ── */}
          <div
            ref={gridLayerRef}
            className="pc-layer px-5 py-4"
            data-role="grid"
            data-shown={showSub ? undefined : 'true'}
            inert={showSub}
          >
            {/* Module search — filters the card grid in place. */}
            <div className="relative mb-3">
              <Search
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Modül ara…"
                className="pl-9"
                aria-label="Modül ara"
                data-action="search"
                data-entity="command"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Sonuç bulunamadı.</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2.5">
                {filtered.map((mod) => {
                  const Icon = mod.icon;
                  const active = isNavItemActive(mod.to, pathname);
                  const hasChildren = (mod.children?.length ?? 0) > 0;
                  return (
                    <li key={mod.id}>
                      {/* A module with children is a disclosure (button); a leaf is
                          a real link, so middle-click / ⌘-click open it in a new tab
                          instead of being swallowed by an onClick. */}
                      <CardShell
                        to={hasChildren ? undefined : mod.to}
                        onSelect={() => openModule(mod)}
                        onNavigated={onClose}
                        aria-current={active ? 'page' : undefined}
                        aria-expanded={hasChildren ? false : undefined}
                        aria-describedby={mod.description ? `${mod.id}-desc` : undefined}
                        className={cn(
                          // Cards carry their own ground: the panel floats on glass,
                          // and bright page content behind it would otherwise read
                          // straight through the card. Left-aligned icon → title →
                          // blurb, with a hover lift echoing .card-interactive.
                          'group focus-visible:ring-ring relative flex h-full w-full flex-col items-start gap-3 rounded-xl border p-4 text-left no-underline outline-none transition-[background-color,border-color,transform] duration-[var(--duration-fast)] active:scale-[0.985] focus-visible:ring-2 motion-reduce:active:scale-100',
                          // Active reads as a marked card, not a filled slab: border +
                          // the dot carry it. A saturated fill here fights the grid.
                          active
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/60 bg-background/60 hover:border-primary/40 hover:bg-foreground/5 hover:-translate-y-px motion-reduce:hover:translate-y-0',
                        )}
                        data-action={hasChildren ? 'open-submenu' : 'navigate'}
                        data-entity={mod.aiEntity ?? 'module'}
                      >
                        <span
                          className={cn(
                            'text-primary flex size-10 shrink-0 items-center justify-center rounded-lg',
                            active ? 'bg-primary/20' : 'bg-primary/10',
                          )}
                        >
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="w-full min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {mod.label}
                          </span>
                          {/* Real meta — the module's own blurb (nav-schema), not a
                              stand-in count. `aria-hidden` keeps it out of the
                              accessible NAME (which stays just the label), while the
                              card's `aria-describedby` re-exposes the same text as an
                              accessible DESCRIPTION — so SR users get the context too. */}
                          {mod.description && (
                            <span
                              id={`${mod.id}-desc`}
                              className="text-muted-foreground mt-1 line-clamp-2 block text-[0.6875rem] leading-snug"
                              aria-hidden
                            >
                              {mod.description}
                            </span>
                          )}
                        </span>
                        {/* Active marker — a dot, so the state never rests on colour alone. */}
                        {active && (
                          <span
                            className="bg-success absolute right-2.5 top-2.5 size-1.5 rounded-full"
                            aria-hidden
                          />
                        )}
                        {/* Disclosure affordance — a chevron that leans in on hover/focus. */}
                        {hasChildren && (
                          <ChevronRight
                            className="text-muted-foreground absolute bottom-3 right-3 size-4 opacity-0 transition-[opacity,transform] duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:opacity-70 group-focus-visible:translate-x-0.5 group-focus-visible:opacity-70 motion-reduce:transition-none"
                            aria-hidden
                          />
                        )}
                      </CardShell>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Sub-navigation layer — a disclosed module's children. Empty until a
              module with children is chosen. ── */}
          <div
            ref={subLayerRef}
            className="pc-layer px-5 py-4"
            data-role="sub"
            data-shown={showSub ? 'true' : undefined}
            inert={!showSub}
          >
            {selectedModule && (
              <SubNavigationView
                module={selectedModule}
                pathname={pathname}
                onNavigated={onClose}
                onBack={() => {
                  // The back button unmounts as we leave; defer the search-field
                  // focus to an effect, since the grid layer is `inert` until the
                  // switch to `showSub === false` commits.
                  wantSearchFocus.current = true;
                  setSelected(null);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* quick commands — chip row (TR/EN · Tema · Son işlemler · AI · Düzen ·
          Yeni ilan). TR/EN is a visual placeholder (Turkish-only today); the rest
          wire to real theme / recent / assistant / layout / create actions. */}
      <div className="border-border/60 bg-background/40 flex flex-none flex-wrap items-center gap-2 border-t px-5 py-3">
        {/* Language — the app is Turkish-only today, so TR is the current (fixed)
            language and EN is surfaced as an explicitly disabled "coming soon"
            control, not a toggle that silently does nothing. TR uses a solid fill
            (not a faint tint) so its active state clears the 3:1 non-text-contrast
            bar without leaning on colour alone. */}
        <div
          role="group"
          aria-label="Dil"
          className="border-border bg-background/60 inline-flex items-center gap-0.5 rounded-full border p-0.5"
        >
          <span
            aria-current="true"
            className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold uppercase"
          >
            TR
          </span>
          <button
            type="button"
            disabled
            aria-label="İngilizce — yakında"
            className="text-muted-foreground inline-flex min-h-11 cursor-not-allowed items-center rounded-full px-3 text-xs font-semibold uppercase opacity-50"
          >
            EN
          </button>
        </div>
        <QuickAction
          icon={Sun}
          label="Tema"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          action="set-theme"
        />
        <QuickAction icon={Clock} label="Son işlemler" onClick={() => go('/audit')} action="navigate" />
        <QuickAction
          icon={Sparkles}
          label="AI Asistanı"
          onClick={() => {
            setAssistantOpen(true);
            onClose();
          }}
          action="open-assistant"
        />
        <QuickAction
          icon={PanelLeft}
          label="Düzen"
          onClick={() => {
            toggleMode();
            onClose();
          }}
          action="set-layout-mode"
        />
        <button
          type="button"
          onClick={() => go('/listings/create')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-semibold outline-none transition-[background-color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
          data-action="create"
          data-entity="listing"
        >
          <Plus className="size-3.5" aria-hidden /> Yeni ilan
        </button>
      </div>

      {/* search strip — the natural-language command box sits last, like a bar. */}
      <div className="border-border/60 bg-background/50 flex-none space-y-2 border-t px-5 py-3">
        {/* NL command — the label + FieldHelp (Golden Rule 6) sit ABOVE the bar so
            the help's 44px hit area never overlaps the circular submit control. */}
        <div className="flex items-center gap-1">
          <Label htmlFor="command-center-nl">Doğal dil komutu</Label>
          <FieldHelp
            label="Komut yardımı"
            help={
              <div className="space-y-1 text-sm">
                <p>Deterministik, kural tabanlı kopilot (LLM yok). Örnekler:</p>
                <ul className="list-inside list-disc">
                  {NL_EXAMPLES.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            }
          />
        </div>
        {/* command bar — sparkle + input + circular submit. */}
        <div className="border-input bg-background focus-within:ring-ring flex items-center gap-2 rounded-full border py-1 pl-4 pr-1.5 focus-within:ring-2">
          <Sparkles className="text-primary size-4 shrink-0" aria-hidden />
          <Input
            id="command-center-nl"
            value={nl}
            onChange={(e) => setNl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runParse();
              }
            }}
            placeholder="İlan, kullanıcı ara ya da komut yaz…"
            aria-describedby="command-center-nl-help"
            className="h-9 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            data-action="type-command"
            data-entity="command"
          />
          <Button
            type="button"
            size="icon"
            onClick={runParse}
            disabled={!nl.trim()}
            className="shrink-0 rounded-full"
            aria-label="Komutu çalıştır"
            data-action="parse-command"
            data-entity="command"
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <span id="command-center-nl-help" className="sr-only">
          Deterministik, kural tabanlı bir kopilottur. Filtre veya sayfa geçişi ifadeleri yazın; öneri
          onaylanmadan uygulanmaz. Örnek: {NL_EXAMPLES.join('; ')}.
        </span>
        {intent && (
          <ProposedIntent intent={intent} onApply={applyProposed} onDismiss={() => setIntent(null)} />
        )}

        {/* Keyboard hints + assistant status. */}
        <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <kbd className={KBD}>Tab</kbd> gezin
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className={KBD}>↵</kbd> seç
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className={KBD}>Esc</kbd> kapat
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="bg-success size-1.5 rounded-full" aria-hidden />
            AI hazır
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Sub navigation — a clean back + module head, then the module's children as a
 * vertical list of full-width rows (dot · label · optional count · chevron).
 */
function SubNavigationView({
  module,
  pathname,
  onNavigated,
  onBack,
}: {
  module: NavItem;
  pathname: string;
  onNavigated: () => void;
  onBack: () => void;
}) {
  const Icon = module.icon;
  const backRef = React.useRef<HTMLButtonElement>(null);

  // Entering the sub view makes the just-clicked card's layer `inert`, dropping its
  // focus to <body>. useLayoutEffect moves focus to the new view's head in the same
  // synchronous pre-paint phase, so that transient body-focus frame is never painted.
  React.useLayoutEffect(() => {
    backRef.current?.focus();
  }, [module.id]);

  return (
    <div className="space-y-3">
      {/* Head — back to the grid + the module identity. */}
      <div className="flex items-center gap-3">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className="hover:bg-foreground/5 focus-visible:ring-ring border-border/60 bg-background/60 inline-flex min-h-11 items-center gap-1.5 rounded-full border pl-2.5 pr-3.5 text-xs font-medium outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
          data-action="close-submenu"
          data-entity="module"
        >
          <ChevronLeft className="size-3.5" aria-hidden /> Geri
        </button>
        <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="text-base font-semibold">{module.label}</h3>
        {isNavItemActive(module.to, pathname) && (
          <span className="bg-success ml-auto size-2 rounded-full" aria-hidden />
        )}
      </div>

      {/* Children — a vertical list of full-width rows. */}
      <ul className="flex flex-col gap-1">
        {(module.children ?? []).map((child) => (
          <SubItem
            key={child.id}
            label={child.label}
            to={child.to}
            badge={child.badge}
            pathname={pathname}
            entity={child.aiEntity}
            onNavigated={onNavigated}
          />
        ))}
      </ul>
    </div>
  );
}

function SubItem({
  label,
  to,
  badge,
  pathname,
  entity,
  onNavigated,
}: {
  label: string;
  to: string;
  badge?: string | undefined;
  pathname: string;
  entity?: string | undefined;
  onNavigated: () => void;
}) {
  const active = pathname === to;
  return (
    <li>
      <Link
        to={to}
        onClick={(e) => {
          if (!isUnmodifiedClick(e)) return;
          onNavigated();
        }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium no-underline outline-none transition-[background-color,border-color] duration-[var(--duration-fast)] focus-visible:ring-2',
          active
            ? 'border-primary/50 text-primary bg-primary/5'
            : 'hover:bg-foreground/5 border-transparent hover:border-border/60',
        )}
        data-action="navigate"
        data-entity={entity ?? 'module'}
      >
        <span
          className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-primary/60')}
          aria-hidden
        />
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <span className="bg-warning/20 text-warning-foreground shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums">
            {badge}
          </span>
        )}
        <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  action,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
  action: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-foreground/5 focus-visible:ring-ring border-border bg-background/60 inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
      data-action={action}
      data-entity="layout"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

function ProposedIntent({
  intent,
  onApply,
  onDismiss,
}: {
  intent: Intent;
  onApply: (i: Intent) => void | Promise<void>;
  onDismiss: () => void;
}) {
  return (
    <div
      className="border-border bg-background space-y-2 rounded-md border p-3"
      role="group"
      aria-label="Önerilen aksiyon"
    >
      {intent.kind === 'filter' && (
        <>
          <IntentHeader icon={Filter} title="Önerilen filtre" />
          <div className="flex flex-wrap gap-1">
            {intent.chips.map((c) => (
              <Badge key={`${c.key}-${c.value}`} variant="secondary">
                {c.label}
              </Badge>
            ))}
          </div>
          <IntentActions confirmLabel="Uygula" onConfirm={() => onApply(intent)} onDismiss={onDismiss} />
        </>
      )}
      {intent.kind === 'navigate' && (
        <>
          <IntentHeader icon={ArrowRight} title="Sayfaya git" />
          <p className="text-sm">
            <span className="font-medium">{intent.label}</span> sayfasına gidilecek.
          </p>
          <IntentActions confirmLabel="Git" onConfirm={() => onApply(intent)} onDismiss={onDismiss} />
        </>
      )}
      {intent.kind === 'bulk-action' && (
        <>
          <IntentHeader icon={Bot} title="AI toplu aksiyonu" />
          <p className="text-muted-foreground text-sm">
            Yazma işlemleri AI asistanının onay akışında yürütülür. Devam etmek için asistanı açın.
          </p>
          <IntentActions confirmLabel="Asistanı aç" onConfirm={() => onApply(intent)} onDismiss={onDismiss} />
        </>
      )}
      {intent.kind === 'unknown' && (
        <>
          <IntentHeader icon={Bot} title="Komut anlaşılamadı" />
          <p className="text-muted-foreground text-sm">
            Filtre veya sayfa geçişi ifadeleri deneyin (ör. “kullanıcılara git”).
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={onDismiss}
            data-action="dismiss-intent"
            data-entity="command"
          >
            Kapat
          </Button>
        </>
      )}
    </div>
  );
}

function IntentHeader({ icon: Icon, title }: { icon: typeof Sparkles; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-primary size-4" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

function IntentActions({
  confirmLabel,
  onConfirm,
  onDismiss,
}: {
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button size="sm" className="min-h-11" onClick={onConfirm} data-action="apply-intent" data-entity="command">
        <CheckCircle2 className="size-4" /> {confirmLabel}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="min-h-11"
        onClick={onDismiss}
        data-action="dismiss-intent"
        data-entity="command"
      >
        Vazgeç
      </Button>
    </div>
  );
}
