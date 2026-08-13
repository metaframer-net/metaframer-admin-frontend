import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyIntent, parseCommand, setAssistantOpen, type Intent } from '@/lib/ai';
import { useSession } from '@/lib/permissions/permission-context';
import { usePermissionMatrix } from '@/lib/permissions/permission-store';
import { navSchema, type NavItem } from '@/config/nav-schema';
import { buildAssistantContext } from '@/components/ai/assistant-context';
import { filterNavByRole, isNavItemActive } from './nav-utils';

const NL_EXAMPLES = [
  "İstanbul'da 500 m² üzeri bekleyen arsa",
  'kullanıcılara git',
  'aktif ilanları göster',
];

/**
 * Personalised AI suggestion chips — contextual quick jumps that replace the old
 * TR/EN · Tema · Düzen · Yeni ilan footer. Only the ones whose target the current
 * role may reach are shown. (TODO: wire live counts to `useDashboardStats` /
 * dashboard insights via `NavItem.badge`.)
 */
const SUGGESTIONS: { label: string; to: string }[] = [
  { label: 'Moderasyon kuyruğu', to: '/listings/moderation' },
  { label: 'Bekleyen ofisler', to: '/users/agents' },
  { label: 'Şikayet kuyruğu', to: '/messages' },
  { label: 'Günün raporu', to: '/reports' },
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
  'data-active'?: 'true' | undefined;
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
 * Command center body. Three stacked regions:
 * 1. a single "Ara… Sor…" box that BOTH live-filters the module grid AND parses a
 *    natural-language command on submit (proposing a navigate/filter intent that
 *    only applies on confirm; write-class intents are handed to the AI assistant);
 * 2. a MODULE CARD GRID (2-up packed on mobile, 4-up on desktop, `.cc-*`), with a
 *    SUB NAVIGATION view for modules that own children;
 * 3. a row of personalised AI suggestion chips.
 *
 * Rendered by the dock hosts (desktop pill inline; mobile island). All titles/
 * labels are visually dropped — the box's placeholder and `aria-label` carry it.
 */
export function CommandCenter({ onClose, contextEntity, className }: CommandCenterProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useSession();
  const matrix = usePermissionMatrix();

  const modules = React.useMemo(
    () => filterNavByRole(navSchema, user.role, matrix),
    [user.role, matrix],
  );

  const parseCtx = React.useMemo(
    () => buildAssistantContext(user.role, matrix, contextEntity),
    [user.role, matrix, contextEntity],
  );

  // Routes the current role may actually reach — used to hide unreachable chips.
  const permittedRoutes = React.useMemo(() => {
    const set = new Set<string>();
    for (const m of modules) {
      set.add(m.to);
      for (const c of m.children ?? []) set.add(c.to);
    }
    return set;
  }, [modules]);
  const suggestions = SUGGESTIONS.filter((s) => permittedRoutes.has(s.to));

  // ONE input drives both concerns: `query` live-filters the grid AND is what the
  // command parser reads on submit ("Ara… Sor…").
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [intent, setIntent] = React.useState<Intent | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const q = query.toLocaleLowerCase('tr').trim();
  const filtered = q
    ? modules.filter((m) => `${m.label} ${m.description ?? ''}`.toLocaleLowerCase('tr').includes(q))
    : modules;

  // Searching is a grid-level action, so it always returns to the card view.
  const selectedModule = q ? undefined : modules.find((m) => m.id === selected);
  const showSub = Boolean(selectedModule);

  const stackRef = React.useRef<HTMLDivElement>(null);
  const gridLayerRef = React.useRef<HTMLDivElement>(null);
  const subLayerRef = React.useRef<HTMLDivElement>(null);
  const wantSearchFocus = React.useRef(false);
  const firstMeasure = React.useRef(true);

  // The grid ↔ sub port animates its height between the two views. Absolute
  // layers can't size their container, so the SHOWN layer is measured and its
  // height is written to the port; a ResizeObserver keeps it synced as the grid
  // filters, or the sub list changes. The first write skips the transition, so the
  // panel opens at its true height instead of growing from 0.
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
  }, [showSub, selectedModule?.id, q, filtered.length]);

  // Returning to the grid parks focus on the search field — but the grid layer is
  // `inert` while the sub view shows, so the focus must wait for the switch to
  // commit rather than fire inside the (now-unmounting) back button's handler.
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

  const runParse = () => {
    if (!query.trim()) return;
    setIntent(parseCommand(query, parseCtx));
  };

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
      {/* ── "Ara… Sor…" — live filter + natural-language command in one box. ── */}
      <div className="flex-none space-y-2 px-3 pb-3 pt-1">
        <div className="border-input bg-background focus-within:ring-ring flex items-center gap-2 rounded-full border py-1 pl-3 pr-1.5 focus-within:ring-2">
          <Sparkles className="text-primary size-4 shrink-0" aria-hidden />
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <Input
            id="command-center-q"
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runParse();
              }
            }}
            placeholder="Ara… Sor…"
            aria-label="Modül ara veya doğal dille komut yaz"
            aria-describedby="command-center-q-help"
            className="h-9 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            data-action="search"
            data-entity="command"
          />
          <Button
            type="button"
            size="icon"
            onClick={runParse}
            disabled={!query.trim()}
            className="shrink-0 rounded-full"
            aria-label="Komutu çalıştır"
            data-action="parse-command"
            data-entity="command"
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <span id="command-center-q-help" className="sr-only">
          Modül adı yazarak listeyi süzün ya da doğal dille bir komut yazıp çalıştırın; öneri
          onaylanmadan uygulanmaz. Örnek: {NL_EXAMPLES.join('; ')}.
        </span>
        {intent && (
          <ProposedIntent intent={intent} onApply={applyProposed} onDismiss={() => setIntent(null)} />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Two-level port: the module grid slides out to the left as a disclosed
            module's sub view slides in from the right (see .pc-stack in theme.css). */}
        <div ref={stackRef} className="pc-stack">
          {/* ── Grid layer — module cards. ── */}
          <div
            ref={gridLayerRef}
            className="pc-layer px-3 pb-3"
            data-role="grid"
            data-shown={showSub ? undefined : 'true'}
            inert={showSub}
          >
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Sonuç bulunamadı.</p>
            ) : (
              <ul className="cc-grid">
                {filtered.map((mod) => {
                  const Icon = mod.icon;
                  const active = isNavItemActive(mod.to, pathname);
                  const hasChildren = (mod.children?.length ?? 0) > 0;
                  return (
                    <li key={mod.id}>
                      {/* A module with children is a disclosure (button); a leaf is
                          a real link, so middle-click / ⌘-click open it in a new tab. */}
                      <CardShell
                        to={hasChildren ? undefined : mod.to}
                        onSelect={() => openModule(mod)}
                        onNavigated={onClose}
                        aria-current={active ? 'page' : undefined}
                        aria-expanded={hasChildren ? false : undefined}
                        data-active={active ? 'true' : undefined}
                        className="cc-card group focus-visible:ring-ring outline-none focus-visible:ring-2"
                        data-action={hasChildren ? 'open-submenu' : 'navigate'}
                        data-entity={mod.aiEntity ?? 'module'}
                      >
                        <span className="cc-card-ico">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="cc-card-title">{mod.label}</span>
                        {/* Active marker — a dot, so the state never rests on colour alone. */}
                        {active && (
                          <span
                            className="bg-success absolute right-2 top-2 size-1.5 rounded-full"
                            aria-hidden
                          />
                        )}
                        {/* Disclosure affordance — a chevron that leans in on hover/focus. */}
                        {/* Disclosure chevron — desktop only (inline, horizontal
                            card). Hidden on the vertical mobile tile so it can't add
                            a third row and blow the 100px height cap. */}
                        {hasChildren && (
                          <ChevronRight
                            className="text-muted-foreground ml-auto hidden size-4 shrink-0 opacity-0 transition-[opacity,transform] duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:opacity-70 group-focus-visible:translate-x-0.5 group-focus-visible:opacity-70 motion-reduce:transition-none xl:block"
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

          {/* ── Sub-navigation layer — a disclosed module's children. ── */}
          <div
            ref={subLayerRef}
            className="pc-layer px-3 pb-3"
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
                  wantSearchFocus.current = true;
                  setSelected(null);
                }}
              />
            )}
          </div>
        </div>

        {/* Suggestions sit INSIDE the scroll flow, right under the grid, so there is
            no mid-panel gap on the full-height mobile island; any extra vertical
            space falls at the very bottom. On the content-height desktop panel it
            reads the same as a pinned footer. */}
        {suggestions.length > 0 && (
          <div className="border-border/60 bg-background/40 border-t px-3 py-3">
            {/* Mobile: ALWAYS 2×2 (2 side-by-side, 2 below). Labels wrap to two lines
                rather than truncate, so they stay readable even at 320px. Desktop: a
                single wrapping row of capsules. */}
            <div className="grid grid-cols-2 gap-2 xl:flex xl:flex-wrap">
              {suggestions.map((s) => (
                <button
                  key={s.to}
                  type="button"
                  onClick={() => go(s.to)}
                  className="border-border bg-background/70 hover:border-primary/50 hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-center text-xs font-medium leading-tight outline-none transition-[background-color,border-color,transform] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100 xl:min-h-0 xl:rounded-full"
                  data-action="navigate"
                  data-entity="suggestion"
                >
                  <Sparkles className="text-primary size-3.5 shrink-0" aria-hidden />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
      <div className="flex items-center gap-2.5">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className="hover:bg-foreground/5 focus-visible:ring-ring border-border/60 bg-background/60 inline-flex min-h-11 items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-xs font-medium outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
          data-action="close-submenu"
          data-entity="module"
        >
          <ChevronLeft className="size-3.5" aria-hidden /> Geri
        </button>
        <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold">{module.label}</h3>
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
          'focus-visible:ring-ring flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium no-underline outline-none transition-[background-color,border-color] duration-[var(--duration-fast)] focus-visible:ring-2',
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
