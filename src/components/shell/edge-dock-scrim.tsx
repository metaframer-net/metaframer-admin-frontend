import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Scrim } from '@/components/ui/scrim';
import type { DockEdge } from './EdgeDock';

/**
 * Shared backdrop for the edge docks.
 *
 * Each {@link EdgeDock} used to render its OWN `<Scrim>`, so with more than one
 * ear open (easy on touch, where the pointer-proximity auto-close never fires)
 * the identical semi-transparent `--scrim` layers stacked and the page kept
 * getting darker with each ear. This provider hoists a SINGLE scrim: it dims once
 * whenever ANY ear is open — no accumulation, no matter how many are open — and a
 * tap on it closes them all at once.
 */
interface EdgeDockScrimApi {
  /** An ear reports its live open state; the provider derives "any open" from all. */
  reportOpen: (edge: DockEdge, open: boolean) => void;
  /** Bumped when the shared scrim is tapped — every ear watches it and closes. */
  closeToken: number;
  /** Ask all ears to close (used by the scrim's own click). */
  requestCloseAll: () => void;
}

const noop = () => {};

const EdgeDockScrimContext = createContext<EdgeDockScrimApi>({
  reportOpen: noop,
  closeToken: 0,
  requestCloseAll: noop,
});

/** Read the shared-scrim API. Returns a safe no-op outside a provider (standalone stories). */
export function useEdgeDockScrim(): EdgeDockScrimApi {
  return useContext(EdgeDockScrimContext);
}

/**
 * Wraps the edge docks and renders the one shared scrim behind them (z-25, below
 * the ears at z-30 and the command pill at z-40). Keeps the previous timing: a
 * slow 1s fade-in, quick 280ms fade-out.
 */
export function EdgeDockScrimProvider({ children }: { children: ReactNode }) {
  const [openEdges, setOpenEdges] = useState<Record<DockEdge, boolean>>({
    bottom: false,
    left: false,
    right: false,
  });
  const [closeToken, setCloseToken] = useState(0);

  const reportOpen = useCallback((edge: DockEdge, open: boolean) => {
    setOpenEdges((prev) => (prev[edge] === open ? prev : { ...prev, [edge]: open }));
  }, []);

  const requestCloseAll = useCallback(() => setCloseToken((t) => t + 1), []);

  const anyOpen = openEdges.bottom || openEdges.left || openEdges.right;

  const api = useMemo<EdgeDockScrimApi>(
    () => ({ reportOpen, closeToken, requestCloseAll }),
    [reportOpen, closeToken, requestCloseAll],
  );

  return (
    <EdgeDockScrimContext.Provider value={api}>
      {children}
      <Scrim
        open={anyOpen}
        onClick={requestCloseAll}
        openDuration={1000}
        openEasing="cubic-bezier(0.22, 0.61, 0.36, 1)"
        closeDuration={280}
        closeEasing="cubic-bezier(0.4, 0, 1, 1)"
        zIndex={25}
      />
    </EdgeDockScrimContext.Provider>
  );
}
