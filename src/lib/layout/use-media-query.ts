import { useEffect, useState } from 'react';

/**
 * Subscribes a component to a media query. The app is a SPA, so the very first
 * render already reads the real match — no hydration flash. Environments without
 * `matchMedia` (jsdom) report `false`, which every caller must treat as the safe
 * fallback.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);

  return matches;
}

/**
 * The `xl` breakpoint (1024px, see `--breakpoint-xl`) — where the dock switches
 * from the mobile command bar to the floating pill, and therefore where the
 * command center moves from a dialog into the pill itself.
 */
export const DOCK_DESKTOP_QUERY = '(min-width: 1024px)';
