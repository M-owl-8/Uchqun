# Mobile apps for Teacher & Parent portals (PWA + APK)

The Teacher and Parent portals are now installable **Progressive Web Apps
(PWA)** — and can additionally be packaged as real Android **APK** files using
the Trusted Web Activity (TWA) configs committed in `twa/`.

Both portals live in the same deployment
(`https://teacher-production-0647.up.railway.app`): Parent at `/`, Teacher at
`/teacher`. They register as **two separate apps** — each with its own name,
icon, theme color, and launch URL — because the two manifests have distinct
`id` values (`uchqun-parent`, `uchqun-teacher`).

| | Parent | Teacher |
|---|---|---|
| App name | Uchqun Ota-ona | Uchqun O'qituvchi |
| Icon | Heart + spark, steel blue | Spark, violet |
| Start URL | `/` | `/teacher` |
| Manifest | `/manifest-parent.webmanifest` | `/manifest-teacher.webmanifest` |
| Android package (TWA) | `uz.uchqun.parent` | `uz.uchqun.teacher` |

## What ships in this change

- `teacher/public/manifest-{parent,teacher}.webmanifest` — per-portal manifests
- `teacher/public/icons/{parent,teacher}/` — 192/512 + maskable + apple-touch icons
- `teacher/index.html` — injects the correct manifest/icons/theme-color by route
- `teacher/public/sw.js` — conservative service worker (network-first navigations,
  cache-first only for hashed `/assets/`; never touches `/api`, `/uploads`, `/socket.io`)
- `teacher/src/main.jsx` — registers the worker in production builds only
- `teacher/public/.well-known/assetlinks.json` — TWA domain verification, already
  filled with the SHA-256 fingerprints of the keystores that signed the
  2026-08-10 APK builds (`uz.uchqun.teacher` v1.0.0, `uz.uchqun.parent` v1.0.0)
- `teacher/public/serve.json` — `sw.js` no-cache + manifest content-type headers
- `twa/{teacher,parent}/twa-manifest.json` — ready-made Bubblewrap configs

## Path 1 — Install today, no APK file (works the moment this deploys)

Android / Chrome:
1. Open the portal URL, log in.
2. Chrome shows an **Install app** prompt (or menu ⋮ → *Add to Home screen → Install*).
3. The app appears in the launcher with its own icon and opens **full-screen,
   no address bar** — visually indistinguishable from a native app.

iOS / Safari: Share → **Add to Home Screen**. Same result (icon, standalone
window, own title).

This needs zero app-store review, zero signing, and updates itself on every
deploy. For a 2-hour deadline this is the path to demo.

## Path 2 — Real APK files (TWA), ~20 minutes once the PWA is deployed

A TWA APK is a thin native wrapper that loads the live site in a browserless
window. **Prerequisite: the PWA changes above must be deployed to production
first**, because the wrapper reads the live manifest and — for hiding the URL
bar — verifies the domain via `assetlinks.json`.

### Option A — PWABuilder (no local toolchain)

1. Go to <https://www.pwabuilder.com>, enter
   `https://teacher-production-0647.up.railway.app/` (parent) — for the teacher
   app, enter `https://teacher-production-0647.up.railway.app/teacher`.
2. *Package for stores → Android*. Set the package ID from the table above.
3. Download the zip: it contains a **signed APK** (+ AAB for Play Store) and the
   `assetlinks.json` with the signing fingerprint.
4. Merge that fingerprint into `teacher/public/.well-known/assetlinks.json`
   (replace the `REPLACE_WITH_*` placeholder for the matching package) and deploy.
   Until this is live, the app works but shows a small browser bar on top.

### Option B — Bubblewrap CLI (reproducible, config committed)

Requires Node 20+, JDK 17, Android SDK build tools (Bubblewrap offers to
download the JDK/SDK on first run).

```bash
npm i -g @bubblewrap/cli
cd twa/teacher     # or twa/parent

# One-time: create a signing keystore (keep it safe — losing it means you
# can never update the installed app)
keytool -genkeypair -v -keystore android.keystore -alias uchqun-teacher \
  -keyalg RSA -keysize 2048 -validity 10000

bubblewrap build   # reads twa-manifest.json → app-release-signed.apk

# Print the SHA-256 fingerprint for assetlinks.json:
keytool -list -v -keystore android.keystore -alias uchqun-teacher | grep SHA256
```

Paste the fingerprint into `teacher/public/.well-known/assetlinks.json`
(`sha256_cert_fingerprints` of the matching package), deploy, done — the URL
bar disappears and the app is indistinguishable from native.

### Distributing without Play Store

The signed APK can be shared directly (Telegram, download link, USB). Android
asks the user to allow "install from unknown sources" once. For Play Store
distribution, upload the AAB instead (one-time $25 developer account,
review typically 1–3 days).

## Keystore custody (IMPORTANT)

The first signed APKs (2026-08-10) were built with per-app keystores generated
outside the repo (deliberately NOT committed — a committed keystore lets anyone
publish updates as you). **Whoever holds those `.keystore` files must keep
them safe**: Android only accepts updates signed by the same key. If a
keystore is lost, users must uninstall/reinstall under a new package or new
key, and `assetlinks.json` must be updated with the new fingerprint.

## Same-origin API (MOBILE-AUTH-FIX — do not regress)

The teacher/parent portal calls the API **same-origin** (`/api/v1`), proxied to
the backend by `teacher/proxy-server.mjs` (the Railway service's
startCommand). This is what makes login work inside the installed apps:
`up.railway.app` is on the Public Suffix List, so frontend and backend
subdomains are *different sites* and cookies sent cross-origin are
third-party — blocked by Samsung Internet (default), iOS Safari PWAs, and
Chrome tracking protection, which broke login in the TWA/PWA with an instant
bounce back to `/login`. The API base is pinned with a Vite `define` in
`teacher/vite.config.js` because Railway rebuilds the app with its own
`VITE_API_URL` env var — env alone cannot hold this invariant. Never point
this portal back at an absolute backend URL.

## Notes & gotchas

- `express.static` ignores dotfiles, so `server.js` mounts
  `/.well-known` explicitly — relevant only if serving switches back from
  `npx serve` to `server.js`.
- The service worker is registered only in production builds; the dev server
  (`npm run dev`) is never affected.
- Icon sources are SVGs rendered to PNG; regenerate by editing the SVGs in this
  doc's commit history or re-exporting at 512/192/180 px.
- Two manifests share `scope: "/"` deliberately: the teacher app's login page
  (`/login`) is outside `/teacher`, and a narrower teacher scope would flash
  "leaving app" chrome during login.
