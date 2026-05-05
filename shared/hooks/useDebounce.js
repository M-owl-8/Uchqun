import { useCallback, useRef } from 'react';

export function useDebounce(fn, delay = 300) {
  const timerRef = useRef(null);

  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { fn(...args); }, delay);
  }, [fn, delay]);
}

export function useSubmitDebounce(fn, delay = 500) {
  const inFlightRef = useRef(false);

  return useCallback(async (...args) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fn(...args);
    } finally {
      setTimeout(() => { inFlightRef.current = false; }, delay);
    }
  }, [fn, delay]);
}
