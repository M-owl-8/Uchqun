import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useSubmitDebounce } from '../../../shared/hooks/useDebounce';
import { useAsync } from '../../../shared/hooks/useAsync';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only fires the latest call after delay', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebounce(fn, 200));
    act(() => {
      result.current('a');
      result.current('b');
      result.current('c');
    });
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('default delay is 300ms', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebounce(fn));
    act(() => result.current('x'));
    act(() => { vi.advanceTimersByTime(299); });
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('useSubmitDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('blocks concurrent submissions', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const { result } = renderHook(() => useSubmitDebounce(fn, 500));
    act(() => { result.current('a'); });
    act(() => { result.current('b'); });
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('useAsync', () => {
  it('starts not loading when immediate=false', () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsync(fn, false));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('starts loading when immediate=true and resolves data', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 'x' });
    const { result } = renderHook(() => useAsync(fn, true));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 'x' });
    expect(result.current.error).toBeNull();
  });

  it('captures error and re-throws on execute failure', async () => {
    const err = new Error('boom');
    const fn = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => useAsync(fn, false));
    await act(async () => {
      try { await result.current.execute(); } catch { /* expected */ }
    });
    await waitFor(() => expect(result.current.error).toBe(err));
    expect(result.current.loading).toBe(false);
  });

  it('marks data stale on Network Error but keeps last data', async () => {
    let call = 0;
    const fn = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) return Promise.resolve({ ok: true });
      const e = new Error('Network Error');
      return Promise.reject(e);
    });
    const { result } = renderHook(() => useAsync(fn, false));
    await act(async () => { await result.current.execute(); });
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.isStale).toBe(false);
    await act(async () => {
      try { await result.current.execute(); } catch { /* expected */ }
    });
    expect(result.current.data).toEqual({ ok: true }); // kept
    expect(result.current.isStale).toBe(true);
  });
});
