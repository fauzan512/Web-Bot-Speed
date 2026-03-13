# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a Hero SMS Bot web app for buying virtual phone numbers from hero-sms.com.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend framework**: React + Vite + Tailwind CSS
- **API framework**: Express 5
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **UI**: Custom dark-mode components (zinc/emerald theme)
- **Animations**: Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (proxy for hero-sms.com)
│   └── sms-bot/            # React + Vite frontend (Hero SMS Bot)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Hero SMS Bot Features

- **Login**: Enter hero-sms.com API key, validates against real API
- **Mexico Mode**: Parallel buy WA numbers (+52), max $2.00/number, spam-buy until balance runs out
- **Philippines Mode**: Sequential buy WA numbers (+63), max $0.17/number, configurable quantity
- **OTP Polling**: Auto-polls every 5 seconds for SMS OTP
- **Cancel & Refund**: Cancel order after 2 minutes to get balance back
- **Live Logs**: Color-coded system log panel
- **Audio Alert**: Web Audio API beep when OTP is received
- **LocalStorage**: Persists API key and orders across sessions

## Performance Improvements Over Original

The original used `curl` subprocesses (slow, blocking, platform-dependent). This version uses:
- Native `fetch()` API with proper timeout via `AbortController` (non-blocking, fast)
- No proxy - direct connection to hero-sms.com API from server side
- All API calls go through `/api/*` routes on the Express server

## API Routes (artifacts/api-server)

- `GET /api/balance` - Get account balance
- `GET /api/prices?service=wa&country=X` - Get number prices
- `POST /api/buy` - Buy a phone number
- `GET /api/status/:id` - Get order status / OTP
- `POST /api/cancel/:id` - Cancel an order
