import { Bell, ClipboardCheck, ScrollText, ChevronRight, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useNotifications, type NotificationItem } from '@/features/notifications';

const KIND_ICON: Record<NotificationItem['kind'], LucideIcon> = {
  moderation: ClipboardCheck,
  audit: ScrollText,
};

/**
 * Notification center: bell + count badge + a Popover list, deep-linking to the
 * relevant surface. Data is DERIVED (moderation queue + audit) — no new source
 * of truth. Rendered in the command dock; gated by the `notificationCenter` flag
 * at the call site.
 */
export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useNotifications();
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const label =
    unread > 0 ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={label}
          data-action="open-notifications"
          data-entity="notification"
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span
              className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold leading-4 tabular-nums"
              aria-hidden
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={8} className="w-80 max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Bildirimler</p>
          {unread > 0 && (
            <span className="text-muted-foreground text-xs tabular-nums">{unread} bekleyen</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3" aria-hidden>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            className="py-6"
            title="Bildirimler alınamadı"
            description="Bildirim akışı yüklenemedi."
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState className="py-8" icon={Bell} title="Bildirim yok" description="Şu an bekleyen bir şey yok." />
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.to)}
                    className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2"
                    data-action="navigate"
                    data-entity="notification"
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-md',
                        item.kind === 'moderation'
                          ? 'bg-warning/15 text-warning-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.description && (
                        <span className="text-muted-foreground block truncate text-xs">{item.description}</span>
                      )}
                    </span>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
