# Spotz

A shared pin map web app for small friend groups. Drop customizable pins on a Leaflet map, tag them with statuses, and comment in real time — powered by Supabase.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase (auth, database, realtime, storage)
- Leaflet + OpenStreetMap
- Vercel (deployment)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of `supabase/schema.sql`.
3. Under **Authentication → Providers**, enable Email.
4. Copy your project URL and anon key from **Settings → API**.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home — list your groups |
| `/login` | Sign in / sign up |
| `/group/:id` | Full-screen map for a group |
| `/group/:id/members` | Group member list |

## Map usage

- **Right-click** the map to drop a pin at that location
- **Click "Drop here"** to drop a pin at your current GPS location
- **Click a pin** to view details and comments
- Pin creators can edit or delete their own pins

## Pin statuses

| Status | Badge color |
|--------|-------------|
| Went | Green |
| Want to go | Blue |
| Favorite | Yellow/gold |
| Avoid | Red |
