import { useOnlineStatus } from '../hooks/useAsync';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-sm font-medium text-center py-2 px-4"
    >
      You are offline. Some data may be outdated.
    </div>
  );
}

export function StaleIndicator({ isStale, onRetry, className = '' }) {
  if (!isStale) return null;
  return (
    <div className={`flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 ${className}`}>
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span>Showing cached data.</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 underline hover:no-underline font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}
