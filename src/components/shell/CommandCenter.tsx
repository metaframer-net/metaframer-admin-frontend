import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  Filter,
  Monitor,
  Moon,
  PanelLeft,
  PanelTop,
  Rows3,
  Search,
  Send,
  Sparkles,
  Sun,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { ROLE_LABELS } from '@/lib/permissions/permissions';
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
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
  const { setMode, setTheme, toggleDensity } = useLayout();

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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {/* Module search — filters the card grid in place. */}
        <div className="relative">
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

        {selectedModule ? (
          <SubNavigationView
            module={selectedModule}
            others={modules.filter((m) => m.id !== selectedModule.id)}
            pathname={pathname}
            onOpenModule={openModule}
            onNavigated={onClose}
            onBack={() => {
              setSelected(null);
              // The button that triggered this is about to unmount — park focus on
              // the search field so it never falls to <body>, which would take the
              // keyboard (and Escape) out of the panel entirely.
              searchRef.current?.focus();
            }}
          />
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Sonuç bulunamadı.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] gap-2">
            {filtered.map((mod) => {
              const Icon = mod.icon;
              const active = isNavItemActive(mod.to, pathname);
              const hasChildren = (mod.children?.length ?? 0) > 0;
              return (
                <li key={mod.id}>
                  {/* A module with children is a disclosure (button); a leaf is a
                      real link, so middle-click / ⌘-click open it in a new tab
                      instead of being swallowed by an onClick. */}
                  <CardShell
                    to={hasChildren ? undefined : mod.to}
                    onSelect={() => openModule(mod)}
                    onNavigated={onClose}
                    aria-current={active ? 'page' : undefined}
                    aria-expanded={hasChildren ? false : undefined}
                    className={cn(
                      // Cards carry their own ground: the panel floats on glass,
                      // and bright page content behind it would otherwise read
                      // straight through the card.
                      'focus-visible:ring-ring relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center no-underline outline-none transition-[background-color,border-color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100',
                      // Active reads as a marked card, not a filled slab: border +
                      // the dot below carry it. A saturated fill here fights the
                      // grid and drowns the label.
                      active
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/60 bg-background/60 hover:border-primary/40 hover:bg-foreground/5',
                    )}
                    data-action={hasChildren ? 'open-submenu' : 'navigate'}
                    data-entity={mod.aiEntity ?? 'module'}
                  >
                    <span
                      className={cn(
                        'text-primary flex size-10 items-center justify-center rounded-md',
                        active ? 'bg-primary/20' : 'bg-primary/10',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="w-full truncate text-xs font-medium">{mod.label}</span>
                    {/* Active marker — a dot, so the state never rests on colour alone. */}
                    {active && (
                      <span
                        className="bg-success absolute right-2 top-2 size-1.5 rounded-full"
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

      {/* extras strip — who you are + the quick commands. */}
      <div className="border-border/60 bg-background/40 flex flex-none flex-wrap items-center gap-1.5 border-t px-5 py-3">
        <span className="mr-1 inline-flex items-center gap-2">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user.name}</span>
          <Badge variant="secondary" className="font-normal">
            {ROLE_LABELS[user.role]}
          </Badge>
        </span>
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
          label="Kenar çubuğu"
          onClick={() => {
            setMode('sidebar');
            onClose();
          }}
          action="set-layout-mode"
        />
        <QuickAction
          icon={PanelTop}
          label="Üst menü"
          onClick={() => {
            setMode('topnav');
            onClose();
          }}
          action="set-layout-mode"
        />
        <QuickAction icon={Rows3} label="Yoğunluk" onClick={() => toggleDensity()} action="toggle-density" />
        <QuickAction icon={Sun} label="Aydınlık" onClick={() => setTheme('light')} action="set-theme" />
        <QuickAction icon={Moon} label="Koyu" onClick={() => setTheme('dark')} action="set-theme" />
        <QuickAction icon={Monitor} label="Sistem" onClick={() => setTheme('system')} action="set-theme" />
      </div>

      {/* search strip — the natural-language command box sits last, like a bar. */}
      <div className="border-border/60 bg-background/50 flex-none space-y-2 border-t px-5 py-3">
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
        <div className="flex gap-2">
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
            placeholder="Örn. İstanbul'da bekleyen arsa ilanları"
            aria-describedby="command-center-nl-help"
            data-action="type-command"
            data-entity="command"
          />
          <Button
            onClick={runParse}
            disabled={!nl.trim()}
            className="shrink-0"
            data-action="parse-command"
            data-entity="command"
          >
            <Send className="size-4" /> Yorumla
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
 * Sub navigation — the selected module's children take the grid while the other
 * modules collapse into a peek strip, so switching sideways stays one click away.
 */
function SubNavigationView({
  module,
  others,
  pathname,
  onOpenModule,
  onNavigated,
  onBack,
}: {
  module: NavItem;
  others: NavItem[];
  pathname: string;
  onOpenModule: (mod: NavItem) => void;
  onNavigated: () => void;
  onBack: () => void;
}) {
  const Icon = module.icon;
  const backRef = React.useRef<HTMLButtonElement>(null);

  // Entering the sub view replaces the card that had focus, so focus moves to the
  // head of the new view instead of being dropped on <body>.
  React.useEffect(() => {
    backRef.current?.focus();
  }, [module.id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className="hover:bg-foreground/5 focus-visible:ring-ring border-border/60 bg-background/60 inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-medium outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
          data-action="close-submenu"
          data-entity="module"
        >
          <ChevronLeft className="size-3.5" aria-hidden /> Tüm modüller
        </button>
        {others.map((mod) => {
          const PeekIcon = mod.icon;
          const hasChildren = (mod.children?.length ?? 0) > 0;
          return (
            <CardShell
              key={mod.id}
              to={hasChildren ? undefined : mod.to}
              onSelect={() => onOpenModule(mod)}
              onNavigated={onNavigated}
              aria-current={isNavItemActive(mod.to, pathname) ? 'page' : undefined}
              className="hover:bg-foreground/5 focus-visible:ring-ring border-border/60 bg-background/60 inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-medium no-underline outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100"
              data-action={hasChildren ? 'open-submenu' : 'navigate'}
              data-entity={mod.aiEntity ?? 'module'}
            >
              <PeekIcon className="text-muted-foreground size-3.5" aria-hidden />
              {mod.label}
            </CardShell>
          );
        })}
      </div>

      <section className="border-border/60 bg-background/50 space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-5" aria-hidden />
          </span>
          <h3 className="text-base font-semibold">{module.label}</h3>
          {isNavItemActive(module.to, pathname) && (
            <span className="bg-success ml-auto size-2 rounded-full" aria-hidden />
          )}
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
          {/* The module's own landing page leads its children. */}
          <SubItem
            label={`${module.label} — genel`}
            to={module.to}
            pathname={pathname}
            entity={module.aiEntity}
            onNavigated={onNavigated}
          />
          {(module.children ?? []).map((child) => (
            <SubItem
              key={child.id}
              label={child.label}
              to={child.to}
              pathname={pathname}
              entity={child.aiEntity}
              onNavigated={onNavigated}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function SubItem({
  label,
  to,
  pathname,
  entity,
  onNavigated,
}: {
  label: string;
  to: string;
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
          'focus-visible:ring-ring flex min-h-11 w-full items-center justify-center rounded-md px-3 py-2 text-center text-xs font-medium no-underline outline-none transition-[background-color,color,scale] duration-[var(--duration-fast)] active:scale-[0.97] focus-visible:ring-2 motion-reduce:active:scale-100',
          active ? 'border-primary/50 text-primary border bg-primary/5' : 'bg-background/50 hover:bg-foreground/5',
        )}
        data-action="navigate"
        data-entity={entity ?? 'module'}
      >
        {label}
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
