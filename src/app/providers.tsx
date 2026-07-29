import * as React from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { createQueryClient } from '@/lib/query/query-client';
import { LayoutProvider, useLayout } from '@/lib/layout/layout-context';
import { SessionProvider } from '@/lib/permissions/permission-context';
import { AuthProvider, type AuthProviderProps } from '@/lib/auth/auth-context';
import type { LayoutConfig } from '@/config/layout';

/** Toaster wired to the resolved theme so toasts match light/dark. */
function ThemedToaster() {
  const { resolvedTheme } = useLayout();
  return <Toaster theme={resolvedTheme} richColors closeButton position="bottom-right" />;
}

export interface ProvidersProps {
  children: React.ReactNode;
  /** Inject a QueryClient (tests). Defaults to a fresh one. */
  queryClient?: QueryClient;
  /** Override initial layout (Storybook decorators). */
  initialLayout?: Partial<LayoutConfig>;
  /** Persist layout to localStorage (disabled in Storybook/tests). */
  persistLayout?: boolean;
  /** Force an initial auth state + skip the boot fetch (Storybook/tests). */
  initialAuth?: AuthProviderProps['initialState'];
}

/** Root provider stack: server state, auth, session/RBAC, layout+theme, toasts. */
export function Providers({
  children,
  queryClient,
  initialLayout,
  persistLayout = true,
  initialAuth,
}: ProvidersProps) {
  const [client] = React.useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider {...(initialAuth ? { initialState: initialAuth } : {})}>
        <SessionProvider>
          <LayoutProvider {...(initialLayout ? { initialConfig: initialLayout } : {})} persist={persistLayout}>
            {children}
            <ThemedToaster />
          </LayoutProvider>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
