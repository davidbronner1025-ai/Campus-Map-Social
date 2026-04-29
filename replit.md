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
- **Bottom Navigation** — Setup / Locations / Users / Issues / Shops (5 tabs)
- **Campus Setup** (`/setup`) — Configure campus name, center coordinates via satellite map click, Israel-centered by default (31.5°N, 35.0°E), Nominatim search restricted to Israel
- **Locations Management** (`/locations`) — Draw polygons for locations with per-type panels:
  - Buildings: announcements + schedule
  - Dining Halls: daily menus + ratings
  - Sports Fields: game sessions + voting
  - **Floor Data Editor** — Add/edit floors with rooms, labels, available seats, wait times
  - **Map style switcher** — Toggle between Satellite, Street, Terrain, and Dark map styles (bottom-right layers button)
  - **Map search bar** — Nominatim geocoding search on the map for finding places
  - **Manager assignment** — Assign registered users as location managers (managerId stored in DB, joined from users table)
- **Issues Management** (`/issues`) — View/filter all issue reports by status, cycle status (open → in_progress → resolved), delete
- **Shops & Deals** (`/shops`) — Full CRUD: create/edit shops with icon, name, description, hours, deals, color, menu items; toggle active/inactive
- **Edit locations** — Edit name, description, type, color, and manager for existing locations
- **Multi-location creation** — "Save & Add Another" button to create multiple locations in sequence without returning to list
- **📌 Pin Messages on Map** — Admin can pin campus-wide messages that appear as 📌 markers on student maps
- **User Management** (`/users`) — List users, invite by phone (generates OTP), delete users, ghost badge for invisible users
  - **Live Map view** — Toggle between User List and Live Map tabs to see all users on a satellite map with active/inactive indicators

## Campus App Features

- **Auth**: Phone OTP flow (demo mode — OTP returned in response, no SMS sent)
- **Map**: Satellite (Esri World Imagery) + CartoDB label overlay, user's location centered
- **Messages**: Pin messages at your location (regular or 5 invitation types)
  - 🚬 Smoke · 🚗 Carpool · 📱 Phone Game · 🍕 Food Order · ⚽ Football
- **Reactions**: Yes/No voting for invitations, thumbs up/down for regular messages
- **Replies**: Threaded chat per message
- **Profile**: Emoji or URL avatar, banner color picker, display name + title
- **Ghost Mode**: Privacy toggle in profile — switch between "Visible on Map" (campus) and "Ghost Mode" to hide from other users' maps
- **Users on Map**: Nearby users shown as avatar markers on the map with active/inactive indicators, togglable via "People" button
- **Events**: Create and join nearby events with RSVP
  - 6 categories: 📚 Study Group · 🎉 Party · 🏀 Sports · 🤝 Club Meeting · 🍜 Food · ✨ Other
  - Feed tab switcher: Messages / Events
  - Distinct event markers on map (rounded square with category emoji)
  - Event detail sheet with RSVP/leave, participant list
  - Create event bottom sheet with title, category picker, date/time, max participants
  - Creator auto-RSVPs, capacity enforcement, unique RSVP constraint
  - Two FABs: primary message compose + secondary event create
- **Unified Map-Centric Layout** (all views share a persistent map):
  - Map is always visible — never hidden when switching between chats or composing
  - Compose sheet (pin message) and Create Event sheet are transparent-backdrop bottom sheets so the campus map remains visible while writing
  - 4-tab bottom navigation: **Map** | **Chats** | **Shops** | **Profile** (all within the home page)
  - Map tab: map takes 40% height (collapsible), feed (messages/events) in panel below
  - Chats tab: map takes 35% height (always visible), chat list panel below
  - Chat detail: full-screen overlay (back button returns to chat list)
  - "Message" button on map user markers opens chat panel directly (no page navigation)
  - Notification deep-links for conversations open the chat panel in-app (`?open=convId`)
- **Direct Chat & Group Messaging**:
  - DM and group conversations with real-time message list (5s polling)
  - Chat list with last message preview and time-ago display (embedded panel in home)
  - Chat detail with message bubbles, sender avatars, optimistic sending
  - Share location in chat (MapPin button)
  - Start chat from map marker popup ("Message" button on user markers)
  - New Chat sheet with nearby-user search
  - Group chat: named groups, add members, leave group
- **Notifications Center**: Bell icon in header with unread badge, dropdown panel with notification list, mark-read/mark-all-read
  - Auto-generated from: reactions on messages, replies to messages, event RSVP joins
  - Notification types: reaction, reply, event_join, nearby_event, chat_message
  - 15-second polling for new notifications, tap-to-navigate to source
- **Floor Navigator**: When a location has floor data configured, a floor-by-floor browser appears in the location detail sheet with room listings, available seats, and wait times
- **Issue Reporting**: Tap any location → Report an Issue with category picker (maintenance/cleanliness/safety/noise/lighting/other), floor selector, and description; active open issues are shown in the sheet
- **Pulse Ticker**: Live activity strip at top of map showing recent nearby messages rotating every 4s
- **Crowd Density**: Colored activity bar in each location's detail header showing real-time busyness (based on message activity in the last 2h)
- **Shops & Deals Tab** (`/campus-app` → Shops nav): Browse all campus shops with name, icon, hours, deals/discounts, and expandable menu items
- **Activity Stats on Profile**: Messages posted, events joined, and issues reported shown as stat cards on the profile page
- **UX Polish**: Loading skeleton placeholders on chats list, empty states with helpful prompts
- **Location engine**: Battery-optimized (network-accuracy, 30s server push, paused when backgrounded)

## Database Schema (lib/db/src/schema/campus.ts)

- `campus` — Campus name, lat/lng center, default zoom
- `locations` — Named locations with polygon, type (building/dining_hall/sports_field), per-type feature config, managerId (FK → users)
- `users` — Phone, display name, title, avatar, banner, visibility (campus/ghost), lat/lng, last seen
- `userOtps` — OTP codes with expiry for phone auth
- `messages` — Pinned messages with type, invitation type, expiry, lat/lng
- `messageReactions` — Yes/No/emoji reactions per message per user
- `messageReplies` — Threaded replies per message
- `events` — Campus events with title, description, category, lat/lng, startsAt, maxParticipants, creatorId
- `event_rsvps` — RSVP records with unique(eventId, userId) constraint, cascade delete
- `conversations` — Chat conversations (type: direct/group, name, creatorId)
- `conversation_members` — Members of each conversation, unique(conversationId, userId)
- `chat_messages` — Messages in conversations (text or location type, with optional lat/lng)
- `notifications` — User notifications (type, referenceId, referenceType, content, read status)
- `issue_reports` — Campus issue reports (userId, locationId, floor, category, description, status: open/in_progress/resolved, isPublic)
- `campus_shops` — Campus shops/deals (campusId, name, icon, description, hours, discount, color, menuItems JSON, active, sortOrder)
- `locations.floorData` — JSON array of floor entries (floor#, label, rooms[], notes, available seats, wait time)

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
- `PUT /api/me` — Update profile fields (including `visibility: "campus" | "ghost"`)
- `PUT /api/me/location` — Push location update
- `GET /api/users/nearby?lat=&lng=&radius=` — Nearby visible users (Haversine filter, excludes ghost users)

### Events (requires Bearer token)
- `GET /api/events/nearby?lat=&lng=&radius=` — Nearby upcoming events (Haversine, future only)
- `POST /api/events` — Create event (auto-RSVPs creator)
- `DELETE /api/events/:id` — Delete own event
- `GET /api/events/:id` — Event detail with RSVP list
- `POST /api/events/:id/rsvp` — Join event
- `DELETE /api/events/:id/rsvp` — Leave event

### Messages (requires Bearer token)
- `GET /api/messages/nearby?lat=&lng=&radius=` — Nearby messages with Haversine filter
- `POST /api/messages` — Pin a new message
- `DELETE /api/messages/:id` — Delete own message
- `POST /api/messages/:id/react` — React (yes/no/emoji)
- `GET /api/messages/:id/replies` · `POST /api/messages/:id/replies`

### Chat (requires Bearer token)
- `GET /api/conversations` — List user's conversations with members + last message
- `POST /api/conversations` — Create DM (idempotent: finds existing) or group chat
- `GET /api/conversations/:id/messages?before=&limit=` — Paginated messages
- `POST /api/conversations/:id/messages` — Send message (text or location)
- `POST /api/conversations/:id/members` — Add member to group
- `DELETE /api/conversations/:id/members` — Leave group

### Notifications (requires Bearer token)
- `GET /api/notifications?limit=&before=` — List notifications with unread count (cursor pagination)
- `PUT /api/notifications/:id/read` — Mark single notification as read
- `PUT /api/notifications/read-all` — Mark all notifications as read

### Issues (requires Bearer token)
- `GET /api/issues?locationId=` — List issue reports (filtered by location)
- `POST /api/issues` — Submit a new issue report
- `PATCH /api/issues/:id/status` — Update issue status (open/in_progress/resolved)
- `DELETE /api/issues/:id` — Delete an issue report

### Shops
- `GET /api/shops` — List active campus shops (public)
- `GET /api/shops/all` — List all shops including inactive (requires auth)
- `POST /api/shops` · `PATCH /api/shops/:id` · `DELETE /api/shops/:id`

### Locations (new endpoints)
- `PATCH /api/locations/:id/floors` — Update floor data JSON for a location (requires auth)
- `GET /api/locations/:id/crowd` — Get crowd density (message count in last 2h, returns { count, density })

### Users (new endpoint)
- `GET /api/users/me/stats` — Get own activity stats: messagesPosted, eventsJoined, issuesReported

### Bulletin Board (requires Bearer token)
- `GET /api/bulletin?category=` — List bulletin posts (newest first) joined with author; includes `likedByMe` and `isMine`. category ∈ social|lostfound|market
- `POST /api/bulletin` — Create a post: { category, subType?, text, price?, isAnonymous? }. Validates per-category (lostfound requires subType lost|found; price only for market)
- `DELETE /api/bulletin/:id` — Delete own post
- `POST /api/bulletin/:id/like` — Toggle like (returns { liked, likesCount })

Tables: `bulletin_posts`, `bulletin_post_likes` (unique on postId+userId). Anonymous posts hide author identity in API response.

### Admin (no auth required)
- `GET/PATCH/DELETE /api/admin/issues/:id` — Admin issues management
- `GET/POST/PATCH/DELETE /api/admin/shops/:id` — Admin shops management
- `PATCH /api/admin/locations/:id/floors` — Admin floor data update

## Key Notes

- **Leaflet CSS** must be imported before `index.css` in `main.tsx` to avoid Tailwind v4 processing conflicts
- **JWT secret** stored as `JWT_SECRET` environment variable
- **OTP demo mode**: In dev only, OTP is echoed in `/api/auth/request-otp` response body and stored in `lastOtpForDev` (gated by `NODE_ENV !== "production"`); production never leaks the code
- **API base URL**: All campus-app API calls use absolute `/api` path (no base path prefix)

## Wave 1 — Write-Flow Stability (April 2026)

Audit objective: every save/post/update either completes and updates the UI, or fails with explicit user feedback and full state recovery. No silent swallowing, no orphaned loading states, no duplicate writes.

### Issues Found & Fixed

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `campus-app/pages/profile.tsx` | `handleSave` had `try/finally` only — failures swallowed silently | Added `try/catch/finally` + inline `saveError` UI + duplicate-click guard (`if (saving) return`) |
| 2 | `campus-app/pages/home.tsx` `handleSubmitIssue` | `} catch {}` ate all errors | Added `console.error` + `alert` with Hebrew fallback message + duplicate guard |
| 3 | `campus-app/pages/home.tsx` `ComposeSheet.send` (pin message) | No `catch` block at all — modal stayed open on error | Added catch with alert + duplicate-click guard |
| 4 | `campus-app/pages/home.tsx` `CreateEventSheet.send` | Same — no catch | Same fix pattern |
| 5 | `campus-app/pages/chats.tsx` `shareLocation` | No catch | Added catch with alert + guard |
| 6 | `campus-app/pages/home.tsx` `BulletinTab.handleLike` | Race condition — concurrent toggles corrupted likesCount | Added `pendingLikesRef: Set<number>` guard, snapshot pre-state for rollback, reconcile with server response |
| 7 | `campus-app/pages/home.tsx` `BulletinTab.handleDelete` | Could fire concurrently | Added `pendingDeleteRef: Set<number>` guard; only remove from list AFTER server confirms |
| 8 | `campus-app/pages/home.tsx` `BulletinTab.load` | `.catch(() => {})` masked outages | Added `loadError` state + retry button in empty-state UI |
| 9 | `admin-panel/pages/locations.tsx` `saveFloors` | Showed ✅ Saved even on HTTP 500 (didn't check `r.ok`) | Now throws on `!r.ok`, displays "⚠ Save failed" + inline `saveError` |
| 10 | `admin-panel/pages/locations.tsx` `submitPin` / `deleteAdminMsg` | Didn't check `r.ok`; deleteAdminMsg removed from UI even on failure | Both now check `r.ok`, alert on failure; delete only updates UI after server confirms |
| 11 | `admin-panel/pages/locations.tsx` `submit` / `submitEdit` (location create/update) | TanStack Query mutations had no `onError` | Added `onError` callbacks with alert + `isPending` guard |

### Mock/Fake Data Audit
Searched the entire codebase for `mock|fake|placeholder|hardcoded|Math.random|simulated|onlineCount|liveUsers|fakeData`. **No occurrences found** — all visible counters and stats come from real backend queries.

### Loading State Termination
All async fetchers verified to use `.finally()` for state reset:
- `BulletinTab.load`, `BulletinTab.handleSubmit`, `BulletinTab.handleLike`, `BulletinTab.handleDelete`
- `profile.handleSave`, `profile.getMyStats`
- `ComposeSheet.send`, `CreateEventSheet.send`, `handleSubmitIssue`
- `chats.send`, `chats.shareLocation`, `chats.fetchMessages`
- `admin saveFloors`, `submitPin`, `deleteAdminMsg`

### Smoke Test Results
- Create bulletin post: 201 with full record ✓
- Toggle like: increments/decrements + returns server-confirmed `likesCount` and `liked` ✓
- Delete post: 200 ✓
- Update profile: 200, returns updated user ✓
- Helmet headers + rate-limit headers active on all responses ✓

### Remaining Risks (out-of-scope for Wave 1)
- `chats.tsx`, `profile.tsx` UI labels still in English — defer to Wave 2 (UI/i18n)
- `admin-panel/pages/zones.tsx` has pre-existing TS errors (missing exports from `@workspace/api-client-react`) — defer to its own task
- Background polling intervals (NotificationBell 15s, chats 10s, home 15s) — already verified to clean up on unmount

## Production Hardening (April 2026)

Backend (`artifacts/api-server/src/app.ts` + `index.ts`):
- `helmet()` for security headers (HSTS, X-Frame-Options, nosniff, …)
- CORS allowlist via `CORS_ORIGINS` env (comma-separated); defaults open in dev
- `trust proxy = 1` (required for Replit reverse proxy + rate-limit)
- Body limit: 256kb on `express.json` and `urlencoded`
- Rate limits: global 300 req / 15min, `/api/auth/*` 20 req / 15min, write methods 120 req / 15min
- `GET /health` → `{ ok, ts }` (skipped by rate-limiter)
- 404 + sanitized error middleware: Hebrew messages, never echoes SQL or stack traces
- Graceful shutdown on SIGTERM/SIGINT closes the PG pool

Database (`lib/db/src/index.ts` + `schema/campus.ts`):
- PG pool tuned: `max=20`, `idleTimeoutMillis=30s`, `connectionTimeoutMillis=10s`, error handler on pool
- Indexes added on `messages(createdAt,userId)`, `chat_messages(convId,createdAt)`, `notifications(userId,createdAt)` + `(userId,read)`, `bulletin_posts(category,createdAt)` + `(userId)`

Frontend localization:
- `auth.tsx` fully Hebrew + RTL (icons mirrored to right side, arrows rotated)
- `map-public.tsx` guest banner translated ("קמפוס · ← התחברות", "טוען מפת קמפוס…")
- Bottom nav in `home.tsx` Hebrew (מפה / צ'אטים / לוח / חנויות / פרופיל)
- Remaining English strings (chats, profile, notifications, home compose) — to translate as a follow-up

## Root Scripts

- `pnpm run build` — typecheck then build all packages
- `pnpm run typecheck` — tsc project references check
- `pnpm --filter @workspace/db run push` — push DB schema changes
