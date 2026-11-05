# RoomSplit

## Run locally

1. Install Node.js and pnpm.
2. From this folder, run `pnpm install` once, then `pnpm dev`.
3. Open http://localhost:5173. The API runs at http://localhost:4000 and uses a local SQLite database at `apps/api/prisma/dev.db`.

The API creates or updates the local database schema when it starts. To load the demo group, run `pnpm --filter @roomsplit/api db:seed`.

Demo accounts (after seeding):
- `arjun@example.com` / `password123`
- `priya@example.com` / `password123`
- `rohan@example.com` / `password123`

The **Shared home** section includes supply tracking and restock estimates, purchase-linked expenses, fair chore assignment, and roommate chat. Chat updates every five seconds while the page is open.

## Deploy the full app on Vercel and Supabase

RoomSplit uses two Vercel projects: one for the static web client and one for the Express API. Supabase provides the production PostgreSQL database.

### 1. Prepare PostgreSQL

In Supabase, restore the existing RoomSplit project if it is paused, or create a new PostgreSQL project. Copy its connection string. Before opening the app to users, apply the production schema from `apps/api/prisma/schema.prisma` with `pnpm --filter @roomsplit/api db:push` using the production `DATABASE_URL`.

### 2. Deploy the API

Import this GitHub repository as a Vercel project and set its Root Directory to `apps/api`. Set the framework to Express or Other, and ensure the workspace files outside that directory are available to the build. Add these Vercel environment variables for Production:

- `DATABASE_URL`: Supabase PostgreSQL connection string (use the Supavisor session pooler for serverless connections).
- `JWT_ACCESS_SECRET`: a random secret of at least 32 characters.
- `JWT_REFRESH_SECRET`: a different random secret of at least 32 characters.
- `CRON_SECRET`: a random secret for the scheduled recurring-expense endpoint.
- `CORS_ORIGIN`: the exact Vercel frontend origin, for example `https://roomsplit.vercel.app`.
- `NODE_ENV`: `production`.

`apps/api/vercel.json` schedules the recurring-expense job once a day. The API app is exported for Vercel Functions; local development still runs through `src/server.ts`.

### 3. Deploy the frontend

Create a second Vercel project from the same repository using the repository root. The root `vercel.json` builds the web workspace and publishes `apps/web/dist`. Set this Production environment variable:

- `VITE_API_BASE_URL`: the API project URL ending in `/api`, for example `https://roomsplit-api.vercel.app/api`.

After both projects deploy, set `CORS_ORIGIN` on the API project to the exact frontend URL and redeploy the API.

Free plans have usage and inactivity limits. Supabase can pause a free project after a week with too little database activity; its data remains available for restoration. See the provider dashboards for current limits before relying on the deployment.