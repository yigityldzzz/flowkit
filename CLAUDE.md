# FlowKit — CLAUDE.md

Browser-automation Chrome extension: record a workflow once, replay it (on a
schedule, or with a spreadsheet of variables) forever. Part of the Digital Ad
Expert product portfolio (sibling products: StyleKit, AdFlow).

## Layout

- `apps/extension` — the Chrome extension (Manifest V3, Vite + React + TS).
  - `src/background/index.ts` — service worker: recording state, replay
    engine, API sync, alarm-based scheduling.
  - `src/content/index.ts` — injected into every page: captures
    click/input/select/navigate events while recording, replays steps.
  - `src/popup/App.tsx` — the popup UI (all screens in one file).
  - `src/storage/index.ts` — thin wrapper over `chrome.storage.local`.
  - `public/manifest.json` — the manifest vite actually ships (there's also a
    root-level `manifest.json`, kept in sync but not the build source).
  - Build: `npm run build` (vite) → `dist/`. Manifest V3 background is a
    module-type service worker; content script has NO DOM access outside the
    page it's injected into.
- `apps/web` and `apps/api` (if present) — the flowkit.digitaladexpert.de
  dashboard + backend, separate from the extension.

## Where this actually runs

- **VPS**: `76.13.13.118`, checked out at `/root/flowkit`, PM2-managed
  (`flowkit-api` on port 5000, `flowkit-web` on port 3010).
- **nginx**: `/etc/nginx/sites-available/flowkit`, domain
  `flowkit.digitaladexpert.de`. `/api/` → `127.0.0.1:5000`, everything else
  → `127.0.0.1:3010`.
- **Deploy**: `git pull` on the VPS + `pm2 restart flowkit-api flowkit-web`
  for the web/API. The **extension is separate** — it does NOT auto-deploy.
  After any change under `apps/extension/`, you must `npm run build`,
  zip the `dist/` folder, and upload it via the Chrome Web Store Developer
  Dashboard → the FlowKit listing → "Paket" → "Yeni paket yükle" → submit for
  review. **A GitHub push alone does not reach users.** Bump the version in
  BOTH `apps/extension/manifest.json` and `apps/extension/public/manifest.json`
  before every store upload.
- **CRM**: user registrations show up in the CRM admin panel
  (`crm.digitaladexpert.de`, FlowKit tab) via `/fk-admin/` nginx proxy →
  the extension's own API, with a `x-admin-secret` header injected
  server-side by nginx (never exposed to the browser).

## Known sharp edges (things that already broke once)

- **`manifest.json` icons**: shipped for a while with NO `icons` field even
  though the PNG assets existed on disk — Chrome silently fell back to a
  generic monogram in the toolbar. If the extension's icon ever looks wrong
  again, check the manifest's `icons` / `action.default_icon` fields first.
- **`appendPersistedStep` in background/index.ts**: writes to
  `chrome.storage.local` are queued onto a single promise chain
  (`appendQueue`) on purpose. Do NOT go back to a bare
  `read → push → write` pattern there — under a burst of quick clicks
  (completely normal usage), that lost most of the recorded steps because
  each write raced the next read. Verified empirically: 5 clicks fired
  back-to-back converged to as little as 1 surviving step before the fix.
- **`stopRecording()` resolves the tab from `getActiveTabId()`** (the tab
  background itself stored when recording started), not from whatever the
  freshly-reopened popup's `chrome.tabs.query({active:true})` reports — the
  popup is closed for the whole recording session (`window.close()` after
  Start), so its tab guess at Stop time can't be trusted to match.

## Before considering an extension change "done"

1. `npm run build` inside `apps/extension` must succeed with no tsc errors.
2. Confirm `dist/manifest.json` actually contains the icons + version you
   expect — vite copies `public/` verbatim, so a manifest bug shows up here,
   not just in source.
3. The change isn't live for real users until it's zipped and uploaded to
   the Chrome Web Store (see Deploy above) — pushing to `main` is necessary
   but not sufficient.
