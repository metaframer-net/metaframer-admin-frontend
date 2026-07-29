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
import { MobileBottomNav } from './MobileNav';
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

  const content = children ?? (
    <RouteGuard>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </RouteGuard>
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
        {/* Mobile bottom nav is for sidebar/topnav modes only. In dock mode the
            floating command pill + the (bottom/left/right) edge docks + ⌘K launcher
            carry navigation, so the bottom bar is intentionally omitted. */}
        {effectiveMode !== 'dock' && <MobileBottomNav />}
        <CommandLauncher variant={effectiveMode === 'dock' ? 'cards' : 'list'} />
        <AssistantDock />
        <SessionGuard />
      </div>
    </CommandPaletteProvider>
  );
}
