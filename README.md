# FlowKit — Browser Automation Extension

FlowKit is a Chrome extension that lets anyone **record a browser workflow once and replay it automatically** — no coding required. Click through a process (filling forms, navigating pages, copying data between tabs) once, and FlowKit turns it into a repeatable, schedulable automation.

🔗 [Chrome Web Store](https://chromewebstore.google.com/detail/flowkit-%E2%80%94-browser-automat/mljcchefmldgohhgpicakokbaphdjdee) · 🌐 [flowkit.digitaladexpert.de](https://flowkit.digitaladexpert.de)

## Features

- **One-click recording** — capture clicks, form inputs, navigation, and scrolling as a reusable workflow
- **Smart replay engine** — multiple fallback selectors per step so replays survive minor page changes
- **Scheduled runs** — run workflows automatically on an hourly or daily schedule via the Chrome Alarms API
- **Data tables with variables** — assign `{{variableName}}` placeholders to input steps and run the same workflow against a whole spreadsheet of data (e.g. send 50 personalized messages from one recording)
- **Resilient recording** — steps persist to `chrome.storage.local` in real time, so a service worker restart or page navigation never loses progress
- **Pattern detection** — flags repetitive manual actions and suggests turning them into an automation

## Architecture

This is a monorepo with three apps sharing a common data layer:

```
apps/
  extension/   Chrome MV3 extension (React + Vite) — recording, replay, popup UI
  web/         Next.js dashboard (account, billing, workflow management)
  api/         Express + Prisma REST API (auth, workflow sync, subscriptions)
packages/
  shared/      Shared TypeScript types between apps
```

**Stack:** TypeScript · React · Vite · Next.js · Express · Prisma · PostgreSQL · JWT auth

## Development

```bash
npm install
npm run dev:api          # API on :4000
npm run dev:web          # Dashboard on :3000
cd apps/extension && npm run dev   # Extension (load unpacked from apps/extension/dist)
```

## License

Proprietary — © Digital Ad Expert
