import * as React from 'react';

/**
 * Fire `onIdle` after `timeoutMs` with no user activity. Any pointer/keyboard/
 * scroll/touch event resets the timer. Disable (e.g. once the lock modal is up)
 * by passing `enabled = false`. The callback is read from a ref so changing it
 * does not restart the timer.
 */
export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled = true): void {
  const onIdleRef = React.useRef(onIdle);
  React.useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'pointerdown',
      'scroll',
      'touchstart',
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs, enabled]);
}
