# Campus Social Network

## Overview

A campus-based location social network with two products: an Admin Panel for campus managers and a Campus App for students.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS v4, Leaflet.js / react-leaflet maps

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/       # Express API server (port from PORT env)
│   ├── admin-panel/      # React + Vite admin dashboard (satellite map)
│   └── campus-app/       # Mobile-first PWA for students
├── lib/
│   ├── api-spec/         # OpenAPI spec + Orval codegen config
│   ├── api-client-react/ # Generated React Query hooks
│   ├── api-zod/          # Generated Zod schemas from OpenAPI
│   └── db/               # Drizzle ORM schema + DB connection
├── scripts/              # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Admin Panel Features

- **PIN Security** — Default PIN `1234` (override via `VITE_ADMIN_PIN` env var), session stored in `sessionStorage`, expires on browser close
- **Bottom Navigation** — Setup / Locations / Users tabs
- **Campus Setup** (`/setup`) — Configure campus name, center coordinates via satellite map click, Israel-centered by default (31.5°N, 35.0°E), Nominatim search restricted to Israel
- **Locations Management** (`/locations`) — Draw polygons for locations with per-type panels:
  - Buildings: announcements + schedule
  - Dining Halls: daily menus + ratings
  - Sports Fields: game sessions + voting
  - **Map search bar** — Nominatim geocoding search on the map for finding places
  - **Manager assignment** — Assign registered users as location managers (managerId stored in DB, joined from users table)
  - **Edit locations** — Edit name, description, type, color, and manager for existing locations
- **User Management** (`/users`) — List users, invite by phone (generates OTP), delete users

## Campus App Features

- **Auth**: Phone OTP flow (demo mode — OTP returned in response, no SMS sent)
- **Map**: Satellite (Esri World Imagery) + CartoDB label overlay, user's location centered
- **Messages**: Pin messages at your location (regular or 5 invitation types)
  - 🚬 Smoke · 🚗 Carpool · 📱 Phone Game · 🍕 Food Order · ⚽ Football
- **Reactions**: Yes/No voting for invitations, thumbs up/down for regular messages
- **Replies**: Threaded chat per message
- **Profile**: Emoji or URL avatar, banner color picker, display name + title
- **Location engine**: Battery-optimized (network-accuracy, 30s server push, paused when backgrounded)

## Database Schema (lib/db/src/schema/campus.ts)

- `campus` — Campus name, lat/lng center, default zoom
- `locations` — Named locations with polygon, type (building/dining_hall/sports_field), per-type feature config, managerId (FK → users)
- `users` — Phone, display name, title, avatar, banner, lat/lng, last seen
- `userOtps` — OTP codes with expiry for phone auth
- `messages` — Pinned messages with type, invitation type, expiry, lat/lng
- `messageReactions` — Yes/No/emoji reactions per message per user
- `messageReplies` — Threaded replies per message

## API Endpoints

### Campus & Locations
- `GET /api/campus` — Get campus config
- `POST /api/campus` — Set/update campus config
- `GET /api/locations` · `POST /api/locations` · `PUT /api/locations/:id` · `DELETE /api/locations/:id`

### Auth (demo mode)
- `POST /api/auth/request-otp` — Request OTP (returns `{ otp }` in demo mode)
- `POST /api/auth/verify-otp` — Verify OTP, receive JWT token

### Users (requires Bearer token)
- `GET /api/me` — Get own profile
- `PUT /api/me` — Update profile fields
- `PUT /api/me/location` — Push location update

### Messages (requires Bearer token)
- `GET /api/messages/nearby?lat=&lng=&radius=` — Nearby messages with Haversine filter
- `POST /api/messages` — Pin a new message
- `DELETE /api/messages/:id` — Delete own message
- `POST /api/messages/:id/react` — React (yes/no/emoji)
- `GET /api/messages/:id/replies` · `POST /api/messages/:id/replies`

## Key Notes

- **Leaflet CSS** must be imported before `index.css` in `main.tsx` to avoid Tailwind v4 processing conflicts
- **JWT secret** stored as `JWT_SECRET` environment variable
- **OTP demo mode**: No SMS provider; OTP shown in auth page banner for testing
- **API base URL**: All campus-app API calls use absolute `/api` path (no base path prefix)

## Root Scripts

- `pnpm run build` — typecheck then build all packages
- `pnpm run typecheck` — tsc project references check
- `pnpm --filter @workspace/db run push` — push DB schema changes
