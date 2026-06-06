# PP-NOTIFICATION-LOOP-FIX — Dashboard infinite re-render bug

**Status:** ✅ CLOSED
**Commit:** `a84e8b3`
**Date:** 2026-06-06
**Trigger:** User screenshot of mobile Bugun page showing perpetual loading spinner: "constantly rendering, reloading. explore and define the toot cause and get rid of it."

## Symptom

The new Dashboard (shipped in PP-IA-REDESIGN) showed the top bar (brand + child switcher + bell) and the bottom 5-tab nav correctly, but the content area was a forever-spinning loader. Page was actually re-fetching in a tight loop, never resolving `loading = false`.

## Root cause

`NotificationContext.jsx` exposed `refreshNotifications` as a plain function declared inside the provider body:

```js
const refreshNotifications = () => {
  loadNotifications();
  loadAllNotifications();
};
```

No `useCallback` wrapper, no memoization, no useMemo'd value. **Every render produced a new function identity.**

The new Dashboard listed `refreshNotifications` in its `useEffect` deps:

```js
useEffect(() => {
  if (!selectedChildId) { setLoading(false); return; }
  setLoading(true);
  fetchToday(controller.signal)
    .then(data => {
      if (data) setToday(data);
      refreshNotifications();   // ← triggers loadNotifications + loadAllNotifications
    })
    .finally(() => setLoading(false));
}, [selectedChildId, fetchToday, refreshNotifications, showError, t]);
//                                ↑ unstable identity → loop
```

The cycle:

```
mount → fetchToday → setToday + refreshNotifications()
      → loadNotifications + loadAllNotifications setState
      → NotificationProvider re-renders → returns new refreshNotifications fn
      → Dashboard sees "changed" dep → effect re-runs → setLoading(true)
      → goto 1
```

The old Dashboard (pre-PP-IA-REDESIGN) had the same dep, but its `cache.get(key)` fast-path called `setLoading(false)` *before* the loop kicked in. So the loop ran invisibly in the background — annoying but not user-visible. The new Dashboard has no cache → `setLoading(false)` only fires after the first fetch resolves → loop is visible as a perpetual spinner.

## Fix

Memoize every exported callback in `NotificationContext` and wrap the context value in `useMemo`:

```js
// All exported callbacks MUST be memoized — they are read from useEffect deps
// by consumers (Dashboard, Notifications page). An unmemoized identity causes
// an infinite re-render loop in any consumer that lists them as deps.
const markAsRead          = useCallback(async (id) => { … }, [loadNotifications, loadAllNotifications]);
const markAllAsRead       = useCallback(async ()    => { … }, [loadNotifications, loadAllNotifications]);
const deleteNotification  = useCallback(async (id) => { … }, [loadNotifications, loadAllNotifications]);
const refreshNotifications = useCallback(() => {
  loadNotifications();
  loadAllNotifications();
}, [loadNotifications, loadAllNotifications]);

const value = useMemo(() => ({
  count, notifications, loading,
  markAsRead, markAllAsRead, deleteNotification,
  refreshNotifications, loadAllNotifications,
}), [count, notifications, loading, markAsRead, markAllAsRead, deleteNotification, refreshNotifications, loadAllNotifications]);

return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
```

`loadNotifications` and `loadAllNotifications` were already memoized — this just extends the same hygiene to the rest.

## Why the cleanup wasn't sufficient on its own

Two earlier passes nominally touched this:
- TP-NOTIF-POLL-LOOP (commit `2bd9678`) — added the `isAuthenticated` guard + 429 backoff. Fixed the polling cadence, not the identity hygiene.
- PP-IA-REDESIGN — moved the bell from Xabar tab to a top-bar icon and rewrote the Dashboard with a richer fetch path. The new fetch path **introduced** the dep on `refreshNotifications` in `useEffect`, which surfaced the latent unmemoized-identity bug.

The root-cause fix lives at the source (NotificationContext), not in Dashboard, so future consumers stay safe.

## Verification

- Manual: Dashboard loads and resolves to content row + journal preview + quick links. No more perpetual spinner.
- Build: `npm run build` clean.
- Other contexts checked for the same hazard:
  - `ToastContext.error` — already `useCallback` ✅
  - `SocketContext.on / off / connected` — already `useCallback` ✅
  - **NotificationContext — was the only one with raw functions in the value object.**

## Lesson

**Every context's `value` object must be `useMemo`'d, and every function inside it must be `useCallback`'d.** A consumer should be able to put any callback from any context into a `useEffect` dep array without triggering an infinite loop. This is hygiene that should be enforced by ESLint (`react-hooks/exhaustive-deps` catches the consumer side, but the provider side has no automated check — would be worth a small lint rule).

## Files changed (1)

```
M  teacher/src/parent/context/NotificationContext.jsx   (+24 / −21)
```
