# Ask Samer – Content Engine

A single-user Arabic web app that turns raw video ideas into refined content ideas and full video blueprints (hook, transcript, CTA, filming & editing recommendations). Output is natural spoken Egyptian Arabic for TikTok/Instagram Reels.

## Architecture

```
/frontend                → Vite + React + TypeScript + Tailwind CSS
/worker/content-creator  → Cloudflare Worker API (TypeScript + D1)
```

## Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Cloudflare account (free tier)
- Google Gemini API key (free tier)

## Local Development

### 1. Worker (Backend)

```bash
cd worker/content-creator
npm install

# Set secrets for local dev (creates .dev.vars file)
cat > .dev.vars << 'EOF'
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=any-random-string-32-chars-min
EOF

# Create the D1 database locally and apply schema
wrangler d1 execute ask-samer-db --local --file=schema.sql

# Start worker dev server (runs on http://localhost:8787)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install

# Start dev server (runs on http://localhost:5173, proxies /api to worker)
npm run dev
```

Open http://localhost:5173 in your browser.

## Setting Secrets for Production

```bash
cd worker/content-creator

wrangler secret put GEMINI_API_KEY
wrangler secret put GEMINI_MODEL      # e.g. gemini-2.0-flash
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET
```

## Deploying

### Worker

```bash
cd worker/content-creator

# Apply schema to production D1
wrangler d1 execute ask-samer-db --remote --file=schema.sql

# Deploy worker
npm run deploy
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
npm run build
```

Deploy via Cloudflare Pages dashboard:
1. Connect your Git repo, or use direct upload
2. Build command: `cd frontend && npm install && npm run build`
3. Build output directory: `frontend/dist`
4. Add environment variable `VITE_API_BASE_URL` pointing to your worker URL (e.g. `https://ask-samer-content-engine.your-subdomain.workers.dev`)

Or deploy via CLI:
```bash
wrangler pages deploy dist --project-name=ask-samer
```

## Database Schema

Table `saved_scripts`:

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| idea_title | TEXT | The idea title |
| hook | TEXT | Opening hook line |
| core_content | TEXT | Full transcript |
| cta | TEXT | Call to action |
| visual_elements | TEXT | JSON string array |
| shot_style | TEXT | Filming style description |
| editing_notes | TEXT | JSON string array |
| estimated_duration | TEXT | e.g. "45 ثانية" |
| created_at | TEXT | ISO timestamp |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/login | No | Login with admin password |
| POST | /api/logout | No | Clear session |
| GET | /api/me | No | Check auth status |
| POST | /api/generate-ideas | Yes | Generate 4 idea cards |
| POST | /api/generate-script | Yes | Generate full blueprint |
| POST | /api/scripts | Yes | Save a script |
| GET | /api/scripts | Yes | List saved scripts |
| GET | /api/scripts/:id | Yes | Get script detail |
| DELETE | /api/scripts/:id | Yes | Delete a script |
