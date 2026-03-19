# Campus Social Network - Admin Panel

## Overview

A campus-based location social network starting with the admin panel. Admins can configure the campus location on an interactive map and define named zones/areas across the campus.

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
- **Frontend**: React + Vite, TailwindCSS v4, Leaflet.js maps

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── admin-panel/        # React + Vite admin dashboard
├── lib/
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

## Features (Admin Panel)

- **Campus Setup** (`/setup`) - Configure campus name, center coordinates via interactive map click, and default zoom level
- **Zone Management** (`/zones`) - Draw and manage named zones on the map with types (academic, dining, sports, etc.) and colors

## Database Schema

- `campus` table - Campus name, lat/lng center, default zoom
- `zones` table - Zone name, description, type, color, polygon (JSON array of lat/lng points)

## API Endpoints

- `GET /api/campus` - Get campus configuration
- `POST /api/campus` - Set/update campus configuration
- `GET /api/campus/zones` - Get all zones
- `POST /api/campus/zones` - Create a new zone
- `GET /api/campus/zones/:id` - Get a zone
- `PUT /api/campus/zones/:id` - Update a zone
- `DELETE /api/campus/zones/:id` - Delete a zone

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Run `pnpm run typecheck` from root.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
