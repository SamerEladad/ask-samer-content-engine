# Ask Samer – Content Engine 🎬

An AI-powered **Arabic video content engine** that transforms raw ideas into fully structured video scripts ready for filming. Built for [Ask Samer](https://asksamer.de), a Germany-focused guidance brand helping Arabic speakers navigate life in Europe.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Pages-F38020?logo=cloudflare)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?logo=google)

---

## ✨ What It Does

1. **Write a raw idea** — e.g. "ليه الناس بتفشل في الـ interviews"
2. **Get 4 refined content ideas** — each with a unique angle, type, and explanation
3. **Generate full video blueprints** — hook, core content, CTA, filming instructions, editing notes, and estimated duration
4. **Save, edit & manage scripts** — with status tracking (Not Started → Working → Done), drag-to-reorder, and inline editing

All scripts are generated in **Egyptian Arabic** with a Germany/Europe angle baked in, matching the Ask Samer brand voice.

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript 5.9** | Type safety |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling (dark theme) |
| **TanStack Query** | Server state management & caching |
| **React Router DOM** | Client-side routing |
| **Lucide React** | Icon library |
| **Cloudflare Pages** | Static hosting + edge Functions |

### Backend
| Technology | Purpose |
|---|---|
| **Cloudflare Workers** | Serverless API (edge runtime) |
| **Cloudflare D1** | SQLite database (edge) |
| **Google Gemini API** | AI script generation (gemini-2.5-pro) |
| **HMAC-SHA256** | Session-based authentication |

### Infrastructure
| Tool | Purpose |
|---|---|
| **Wrangler** | Cloudflare CLI for dev & deploy |
| **Vitest** | Testing framework |
| **Pages Functions** | Same-origin API proxy (avoids cross-origin cookie issues) |

---

## 📁 Project Structure

```
ask-samer-content-engine/
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/        # UI components (BlueprintCard, Layout, Button)
│   │   ├── pages/             # Route pages (Home, Saved, Login)
│   │   ├── context/           # Auth & Toast providers
│   │   ├── lib/               # API client, clipboard utils
│   │   └── main.tsx           # App entry point
│   ├── functions/api/         # Cloudflare Pages Functions (API proxy)
│   ├── public/                # Static assets + _routes.json
│   └── vite.config.ts
│
├── worker/content-creator/    # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts           # Worker entry + router
│   │   ├── router.ts          # CORS + route handler
│   │   ├── auth.ts            # HMAC session auth + cookie management
│   │   ├── generate.ts        # Gemini AI integration (ideas + scripts)
│   │   └── scripts.ts         # CRUD endpoints for saved scripts
│   ├── schema.sql             # D1 database schema
│   └── wrangler.jsonc         # Worker config + D1 binding
│
└── README.md
```

---

## 🔑 Key Features

- **AI Content Generation** — Gemini 2.5 Pro generates ideas and full scripts in Egyptian Arabic
- **Brand-Aware Prompting** — Scripts are contextualised for the Ask Samer brand (Germany/Europe guidance)
- **"Surprise Me" Mode** — Leave the input empty and get a random trending topic in the Germany niche
- **Inline Editing** — Edit any section of a saved script directly in the UI, persisted to D1
- **Status Workflow** — Track scripts through `Not Started → Working → Done`
- **Drag & Reorder** — Long-press to drag scripts within the same status group
- **Copy to Clipboard** — One-click formatted copy of the entire script
- **Session Auth** — HMAC-signed cookie authentication with 7-day sessions
- **Dark Theme** — Custom dark UI with yellow/amber accents and IBM Plex Sans Arabic font
- **Mobile Responsive** — Optimised for both desktop and mobile viewports
- **Edge-First Architecture** — Both frontend and backend run on Cloudflare's edge network

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ask-samer-content-engine.git
cd ask-samer-content-engine

# Frontend
cd frontend && npm install

# Worker
cd ../worker/content-creator && npm install
```

### 2. Configure Environment

Create a `.dev.vars` file in `worker/content-creator/`:

```
ADMIN_PASSWORD=your-password
SESSION_SECRET=your-64-char-hex-secret
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Set Up the Database

```bash
cd worker/content-creator
npx wrangler d1 execute ask-samer-db --local --file schema.sql
```

### 4. Run Locally

```bash
# Terminal 1 — Worker API (port 8787)
cd worker/content-creator
npx wrangler dev

# Terminal 2 — Frontend dev server (port 5173)
cd frontend
npm run dev
```

The frontend dev server proxies `/api/*` requests to the Worker automatically.

---

## 🌐 Deployment

### Frontend → Cloudflare Pages

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=ask-samer-content-engine
```

### Worker → Cloudflare Workers

```bash
cd worker/content-creator
npx wrangler deploy
```

Set environment variables in the Cloudflare dashboard:
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `GEMINI_API_KEY`

Apply the database schema to production:

```bash
npx wrangler d1 execute ask-samer-db --remote --file schema.sql
```

---

## 🏗 Architecture

```
Browser ──→ Cloudflare Pages (SPA + Functions proxy)
                │
                ├── Static assets (React build)
                └── /api/* ──→ Pages Function proxy ──→ Cloudflare Worker
                                                            │
                                                            ├── Auth (HMAC cookies)
                                                            ├── Gemini AI API
                                                            └── D1 Database
```

The Pages Function proxy ensures all API calls are **same-origin**, avoiding cross-origin cookie restrictions in modern browsers.

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with admin password |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/check` | Verify current session |
| `POST` | `/api/generate-ideas` | Generate 4 content ideas from raw input |
| `POST` | `/api/generate-script` | Generate a full video blueprint |
| `POST` | `/api/scripts` | Save a script |
| `GET` | `/api/scripts` | List all saved scripts |
| `GET` | `/api/scripts/:id` | Get a single script |
| `PUT` | `/api/scripts/:id` | Update a script |
| `DELETE` | `/api/scripts/:id` | Delete a script |
| `PATCH` | `/api/scripts/:id/status` | Cycle script status |
| `POST` | `/api/scripts/reorder` | Reorder scripts within a status group |

---

## 📄 License

This project is private and built for [Ask Samer](https://asksamer.de).
