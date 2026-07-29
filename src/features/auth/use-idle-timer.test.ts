import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIdleTimer } from './use-idle-timer';

describe('useIdleTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires onIdle after the timeout elapses', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(1000, onIdle));
    act(() => void vi.advanceTimersByTime(1000));
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets the countdown on user activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(1000, onIdle));
    act(() => {
      vi.advanceTimersByTime(600);
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(600);
    });
    expect(onIdle).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(400));
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(1000, onIdle, false));
    act(() => void vi.advanceTimersByTime(3000));
    expect(onIdle).not.toHaveBeenCalled();
  });
});
