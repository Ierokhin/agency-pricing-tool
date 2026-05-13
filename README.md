# Brandon Archibald — Agency Pricing Tool

## Setup & Run

### First time setup
```bash
cd backend
npm install
```

### Start the app
```bash
./start.sh
# or
cd backend && node server.js
```

Open http://localhost:3001 in your browser.

## Development (with hot reload on frontend)
```bash
# Terminal 1 - Backend
cd backend && node server.js

# Terminal 2 - Frontend dev server
cd frontend && npm run dev
```
Open http://localhost:3000

## Rebuild frontend after changes
```bash
cd frontend && npm run build
```

## Data
All data is stored in `backend/db/data.json` - easy to back up!

## Features
- ✅ Roles with hourly rates
- ✅ Service groups (Brand Identity, Marketing Strategy, etc.)
- ✅ Services with contractor cost breakdown (hourly/fixed)
- ✅ Proposal creation with service selection
- ✅ Live pricing preview (margin, partner discount, payment commission)
- ✅ EUR/USD currency with live exchange rate
- ✅ PDF generation (Brandon Archibald style)
- ✅ Internal view with contractor costs and margin
- ✅ Bulk rate indexation
- ✅ Proposal duplication
