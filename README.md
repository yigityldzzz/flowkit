# FlowKit

AI-powered browser workflow recorder and automation tool.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express + Prisma |
| Database | PostgreSQL |
| Frontend | Next.js 14 + TailwindCSS |
| Extension | Chrome MV3 + React |
| Deploy | PM2 + Nginx + SSL |

## Project Structure

```
flowkit/
├── apps/
│   ├── api/          # Express REST API
│   ├── web/          # Next.js dashboard + landing
│   └── extension/    # Chrome Extension MV3
├── nginx/            # Nginx config
├── scripts/          # Setup + deploy scripts
└── .env.example
```

## Local Development

### 1. Prerequisites
- Node.js 20+
- PostgreSQL running locally

### 2. Environment
```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edit both files with your values
```

### 3. API
```bash
cd apps/api
npm install
npm run db:push      # Create DB tables
npm run dev          # http://localhost:4000
```

### 4. Web
```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

### 5. Extension
```bash
cd apps/extension
npm install
npm run build        # Outputs to apps/extension/dist/
```
Then load `apps/extension/dist/` as unpacked extension in `chrome://extensions`.

## Production Deployment (VPS)

### Step 1 — Server setup (run once)
```bash
ssh root@YOUR_VPS_IP
bash setup.sh
```

### Step 2 — Configure environment
```bash
cp .env.example apps/api/.env
# Edit with production DATABASE_URL, JWT secrets
cp .env.example apps/web/.env.local
# Set NEXT_PUBLIC_API_URL=https://flowkit.digitaladexpert.de
```

Generate secure JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3 — Deploy
```bash
bash scripts/deploy.sh
```

### Step 4 — Cloudflare DNS
Add an A record:
```
Type: A
Name: flowkit
Value: YOUR_VPS_IP
Proxy: DNS only (grey cloud) during setup, then enable
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Register |
| POST | /api/auth/login | — | Login |
| POST | /api/auth/refresh | — | Refresh token |
| GET | /api/auth/me | ✓ | Current user |
| PATCH | /api/auth/me | ✓ | Update profile |
| GET | /api/workflows | ✓ | List workflows |
| POST | /api/workflows | ✓ | Create workflow |
| PUT | /api/workflows/:id | ✓ | Update workflow |
| DELETE | /api/workflows/:id | ✓ | Delete workflow |
| POST | /api/replays/start | ✓ | Log replay start |
| PATCH | /api/replays/:id/finish | ✓ | Log replay finish |
| GET | /api/analytics | ✓ | User analytics |

## Chrome Extension Messages

| Message | Direction | Description |
|---------|-----------|-------------|
| START_RECORDING | popup→bg | Begin recording |
| STOP_RECORDING | popup→bg | Stop, return steps |
| SAVE_WORKFLOW | popup→bg | Save to storage + cloud |
| REPLAY_WORKFLOW | popup→bg | Replay on current tab |
| REPLAY_STEP | bg→content | Execute single step |
| AUTH_SET/GET/CLEAR | popup→bg | Auth token management |
