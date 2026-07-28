import * as React from 'react';
import { useMatches, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Filter,
  ListChecks,
  Send,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldHelp } from '@/components/form/FieldHelp';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { hasRouteMeta } from '@/app/route-meta';
import { getAuditLog, type AuditEntry } from '@/lib/audit';
import { usePermission, useSession } from '@/lib/permissions/permission-context';
import { usePermissionMatrix } from '@/lib/permissions/permission-store';
import { applyIntent, parseCommand, selectApprovable, type Intent } from '@/lib/ai';
// PERF NOTE: this panel is reached eagerly (AppShell → AssistantDock → AssistantPanel),
// so anything imported here ships in the initial bundle. The two listings-API hooks below
// are dep-free and tiny (~3 KB), so the cost is negligible today. Do NOT add HEAVY feature
// imports here (recharts/leaflet-backed views, large query modules): if this panel ever
// needs weight, defer it behind the assistant `open` state instead — measured naive
// React.lazy of the whole panel REGRESSED the entry chunk (+10 KB) because Vite hoists the
// then-shared shell modules back into entry, so split at the heavy import, not the panel.
import { useListings } from '@/features/listings/api/queries';
import { useAiApproveListings } from '@/features/listings/api/mutations';
import { AI_APPROVE_PERMISSION, AI_QUEUE_QUERY, buildAssistantContext } from './assistant-context';

const EXAMPLES = [
  "İstanbul'da 500 m² üzeri bekleyen arsa",
  'kullanıcılara git',
  "AI'nın onayladığı bekleyen ilanları onayla",
];

/**
 * Content of the global AI assistant. A RULE-BASED (no LLM) copilot: it parses a
 * command into a structured intent via `lib/ai`, shows it as a card, and applies
 * it ONLY on the user's click. The one write path (bulk approve) is gated behind
 * a ConfirmDialog and audited with an `ai:*` actor — AI proposes, human disposes.
 */
export function AssistantPanel({ onApplied }: { onApplied?: () => void }) {
  const navigate = useNavigate();
  const matches = useMatches();
  const { user } = useSession();
  const matrix = usePermissionMatrix();
  const canApprove = usePermission(AI_APPROVE_PERMISSION);

  const routeMeta = React.useMemo(() => {
    const withMeta = matches.filter((m) => hasRouteMeta(m.handle));
    return withMeta.length ? withMeta[withMeta.length - 1]!.handle : null;
  }, [matches]);
  const contextTitle = hasRouteMeta(routeMeta) ? routeMeta.routeMeta.title : 'Panel';
  const contextEntity = hasRouteMeta(routeMeta) ? routeMeta.routeMeta.aiEntity : undefined;

  const parseCtx = React.useMemo(
    () => buildAssistantContext(user.role, matrix, contextEntity),
    [user.role, matrix, contextEntity],
  );

  const [text, setText] = React.useState('');
  const [intent, setIntent] = React.useState<Intent | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  // Force a re-read of the (non-reactive) append-only audit log after a write.
  const [, refreshAudit] = React.useReducer((n: number) => n + 1, 0);

  const queue = useListings(AI_QUEUE_QUERY);
  const approvable = React.useMemo(
    () => selectApprovable(queue.data?.items ?? []),
    [queue.data],
  );
  const approve = useAiApproveListings();

  const recentAi: AuditEntry[] = getAuditLog().filter((e) => e.actor.startsWith('ai:')).slice(0, 6);

  const runParse = () => setIntent(parseCommand(text, parseCtx));
  const reset = () => {
    setIntent(null);
    setText('');
  };

  const applyNonBulk = async (i: Intent) => {
    await applyIntent(i, {
      confirmed: true,
      onNavigate: (to) => {
        navigate(to);
        onApplied?.();
      },
    });
    reset();
  };

  const applyBulk = async () => {
    if (!intent || intent.kind !== 'bulk-action') return;
    await applyIntent(intent, {
      confirmed: true,
      onNavigate: navigate,
      onBulkApprove: (ids) => approve.mutateAsync(ids).then(() => undefined),
      approvableIds: approvable.map((r) => r.id),
    });
    setConfirmOpen(false);
    reset();
    refreshAudit();
  };

  return (
    <div className="flex h-full flex-col gap-4" data-entity="assistant">
      {/* Context header */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
        <Sparkles className="text-primary size-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Şu an</p>
          <p className="truncate text-sm font-medium">{contextTitle}</p>
        </div>
        <Badge variant="outline" className="ml-auto shrink-0 gap-1 text-xs">
          <Bot className="size-3" aria-hidden /> Kural tabanlı
        </Badge>
      </div>

      {/* Command box */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="assistant-command">Komut</Label>
          <FieldHelp
            label="Komut yardımı"
            help={
              <div className="space-y-1 text-sm">
                <p>Deterministik, kural tabanlı bir kopilottur (LLM yok). Örnekler:</p>
                <ul className="list-inside list-disc">
                  {EXAMPLES.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            }
          />
        </div>
        <Textarea
          id="assistant-command"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Örn. İstanbul'da bekleyen arsa ilanları"
          rows={2}
          aria-describedby="assistant-command-help"
          data-action="type-command"
          data-entity="assistant"
        />
        {/* Persistent SR-only mirror of the FieldHelp content so the help is
            announced via aria-describedby (the icon button alone isn't enough). */}
        <span id="assistant-command-help" className="sr-only">
          Deterministik, kural tabanlı bir kopilottur. Filtre, sayfa geçişi veya toplu onay ifadeleri
          yazabilirsiniz. Örnek: {EXAMPLES.join('; ')}.
        </span>
        <Button
          className="min-h-11 w-full"
          onClick={runParse}
          disabled={!text.trim()}
          data-action="parse-command"
          data-entity="assistant"
        >
          <Send className="size-4" /> Yorumla
        </Button>
      </div>

      {/* Proposed intent (confirm-before-apply) */}
      {intent && (
        <IntentCard
          intent={intent}
          approvableCount={approvable.length}
          canApprove={canApprove}
          onApplyNonBulk={applyNonBulk}
          onRequestBulk={() => setConfirmOpen(true)}
          onDismiss={reset}
        />
      )}

      {/* Moderation copilot status (reflects the pending-queue query) */}
      <CopilotCard
        loading={queue.isLoading}
        error={queue.isError}
        onRetry={() => void queue.refetch()}
        approvableCount={approvable.length}
        canApprove={canApprove}
        onRun={() => setConfirmOpen(true)}
      />

      {/* Recent AI actions */}
      <div className="mt-auto space-y-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Son AI aksiyonları
        </p>
        {recentAi.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz AI kaynaklı işlem yok.</p>
        ) : (
          <ol className="space-y-1.5">
            {recentAi.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-sm">
                <Bot className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium">{e.action}</span>{' '}
                  <span className="text-muted-foreground">{e.resource}</span>
                </span>
                <time className="text-muted-foreground ml-auto shrink-0 tabular-nums text-xs" dateTime={e.ts}>
                  {e.ts.slice(0, 10)}
                  <span className="sr-only"> tarihinde</span>
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="AI toplu onayı"
        description={
          <>
            AI’nın <strong>OK</strong> verdiği <strong>{approvable.length}</strong> bekleyen ilan yayına
            alınacak. Belirsiz/NOK ilanlar <strong>onaylanmaz</strong>. Her onay denetim kaydına
            <code className="mx-1 rounded bg-muted px-1 text-xs">ai:moderation-copilot</code>
            olarak yazılır.
          </>
        }
        confirmLabel={`${approvable.length} ilanı onayla`}
        onConfirm={applyBulk}
      />
    </div>
  );
}

function CopilotCard({
  loading,
  error,
  onRetry,
  approvableCount,
  canApprove,
  onRun,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  approvableCount: number;
  canApprove: boolean;
  onRun: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <ListChecks className="text-primary size-4" aria-hidden />
        <p className="text-sm font-medium">Moderasyon kopilotu</p>
      </div>
      {loading ? (
        <Skeleton className="h-9 w-full" />
      ) : error ? (
        <ErrorState
          className="py-2"
          title="Kuyruk alınamadı"
          description="Bekleyen ilan kuyruğu yüklenemedi."
          onRetry={onRetry}
        />
      ) : approvableCount === 0 ? (
        <p className="text-muted-foreground text-sm">Onay bekleyen AI-OK ilan yok.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">
            AI’nın OK verdiği <strong className="tabular-nums">{approvableCount}</strong> bekleyen ilan
            tek adımda onaylanabilir.
          </p>
          {canApprove ? (
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 w-full"
              onClick={onRun}
              data-action="request-bulk-approve"
              data-entity="listing"
            >
              <CheckCircle2 className="size-4" /> Toplu onayı öner
            </Button>
          ) : (
            <p className="text-destructive text-sm">Bu aksiyon için yetkiniz yok.</p>
          )}
        </div>
      )}
    </div>
  );
}

function IntentCard({
  intent,
  approvableCount,
  canApprove,
  onApplyNonBulk,
  onRequestBulk,
  onDismiss,
}: {
  intent: Intent;
  approvableCount: number;
  canApprove: boolean;
  onApplyNonBulk: (i: Intent) => void | Promise<void>;
  onRequestBulk: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border p-3" role="group" aria-label="Önerilen aksiyon">
      {intent.kind === 'filter' && (
        <>
          <Header icon={Filter} title="Önerilen filtre" />
          <div className="flex flex-wrap gap-1">
            {intent.chips.map((c) => (
              <Badge key={`${c.key}-${c.value}`} variant="secondary">
                {c.label}
              </Badge>
            ))}
          </div>
          <Actions confirmLabel="Uygula" onConfirm={() => onApplyNonBulk(intent)} onDismiss={onDismiss} action="apply-filter" />
        </>
      )}

      {intent.kind === 'navigate' && (
        <>
          <Header icon={ArrowRight} title="Sayfaya git" />
          <p className="text-sm">
            <span className="font-medium">{intent.label}</span> sayfasına gidilecek.
          </p>
          <Actions confirmLabel="Git" onConfirm={() => onApplyNonBulk(intent)} onDismiss={onDismiss} action="apply-navigate" />
        </>
      )}

      {intent.kind === 'bulk-action' && (
        <>
          <Header icon={ListChecks} title="AI toplu aksiyonu" />
          <p className="text-sm">
            AI’nın OK verdiği <strong className="tabular-nums">{approvableCount}</strong> bekleyen ilan
            onaylanacak. <span className="text-muted-foreground">Belirsiz/NOK dahil edilmez.</span>
          </p>
          {!canApprove ? (
            <p className="text-destructive text-sm">Bu aksiyon için yetkiniz yok.</p>
          ) : (
            <Actions
              confirmLabel="Onayla ve uygula"
              confirmDisabled={approvableCount === 0}
              onConfirm={onRequestBulk}
              onDismiss={onDismiss}
              action="request-bulk-approve"
            />
          )}
        </>
      )}

      {intent.kind === 'unknown' && (
        <>
          <Header icon={Bot} title="Komut anlaşılamadı" />
          <p className="text-muted-foreground text-sm">
            Bu komutu yorumlayamadım. Filtre, sayfa geçişi veya toplu onay ifadeleri deneyin.
          </p>
          <Button variant="ghost" size="sm" className="min-h-11" onClick={onDismiss} data-action="dismiss-intent" data-entity="assistant">
            Kapat
          </Button>
        </>
      )}
    </div>
  );
}

function Header({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-primary size-4" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

function Actions({
  confirmLabel,
  confirmDisabled,
  onConfirm,
  onDismiss,
  action,
}: {
  confirmLabel: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  action: string;
}) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="min-h-11"
        onClick={onConfirm}
        disabled={confirmDisabled ?? false}
        data-action={action}
        data-entity="assistant"
      >
        <CheckCircle2 className="size-4" /> {confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" className="min-h-11" onClick={onDismiss} data-action="dismiss-intent" data-entity="assistant">
        Vazgeç
      </Button>
    </div>
  );
}
