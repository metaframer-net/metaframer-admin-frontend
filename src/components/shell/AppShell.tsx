import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { useLayout } from '@/lib/layout/layout-context';
import { useFeatureFlag } from '@/lib/settings/feature-flags-store';
import { AssistantDock } from '@/components/ai';
import { SessionGuard } from '@/features/auth/components/SessionGuard';
import { PageSkeleton } from '@/app/pages/PageSkeleton';
import { CommandPaletteProvider } from './command-palette-context';
import { CommandLauncher } from './CommandLauncher';
import { DockShell } from './DockShell';
import { PageContainer } from './PageContainer';
import { RouteGuard } from './RouteGuard';
import { SidebarShell } from './SidebarShell';
import { TopnavShell } from './TopnavShell';

export interface AppShellProps {
  /** Content override (tests/stories). Defaults to the router <Outlet />. */
  children?: React.ReactNode;
}

/**
 * Configurable shell — renders SidebarShell, TopnavShell, or (behind the
 * `dockLayout` flag) DockShell from a single nav schema, driven by `config.mode`
 * and switchable at runtime without reload. All modes converge to drawer +
 * bottom nav + command launcher below `xl` (1024). When `dock` is selected but
 * the flag is off, we fall back to `sidebar` so existing behavior is untouched.
 */
export function AppShell({ children }: AppShellProps) {
  const { config } = useLayout();
  const dockEnabled = useFeatureFlag('dockLayout');
  const effectiveMode =
    config.mode === 'dock' && !dockEnabled ? 'sidebar' : config.mode;

  // Single insertion point for the page container rule: whichever shell is
  // active renders this inside its <main>, so every page (and every future one)
  // gets the 80%-centered layout for free. Per-route opt-out via
  // `routeMeta.fullWidth` is read inside PageContainer.
  const content = (
    <PageContainer>
      {children ?? (
        <RouteGuard>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </RouteGuard>
      )}
    </PageContainer>
  );

  return (
    <CommandPaletteProvider>
      <div data-shell-mode={effectiveMode}>
        {effectiveMode === 'dock' ? (
          <DockShell>{content}</DockShell>
        ) : effectiveMode === 'sidebar' ? (
          <SidebarShell>{content}</SidebarShell>
        ) : (
          <TopnavShell>{content}</TopnavShell>
        )}
        {/* Bottom liquid dock is handled by EdgeDock inside DockShell (hint bar
            pattern: collapsed → hover/tap opens). No always-visible bottom nav. */}
        {/* In dock mode the mobile pill expands inline (DockShell), so only
            sidebar/topnav need the external CommandLauncher. */}
        {effectiveMode !== 'dock' && <CommandLauncher variant="list" />}
        <AssistantDock />
        <SessionGuard />
      </div>
    </CommandPaletteProvider>
  );
}
