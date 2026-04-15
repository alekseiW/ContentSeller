# GuideHub — Architecture Overview

> Платформа для создания и продажи цифровых продуктов (гайды, мини-курсы, шаблоны).
> Автор создаёт контент в WYSIWYG-редакторе, публикует, покупатели оплачивают через ЮKassa и получают доступ.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript, Vite, TailwindCSS, React Router, Zustand, Tiptap (WYSIWYG), Recharts |
| Backend | Express 5 + TypeScript, tsx (dev), Prisma ORM, Zod validation, Pino logging |
| Database | PostgreSQL 17 (self-hosted, через Docker) |
| AI | Multi-provider: OpenAI → Anthropic → Gemini → Groq (fallback chain) |
| Payments | ЮKassa (create, verify, webhook) |
| Auth | JWT (Bearer token, bcryptjs) |
| Deploy | Docker Compose (dev + prod), Nginx reverse proxy, Let's Encrypt SSL |

## Project Structure

```
ContentSeller/
├── guidehub/              # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── pages/         # 11 страниц (см. Pages ниже)
│   │   ├── components/    # Editor UI components
│   │   ├── editor/        # Tiptap custom extensions
│   │   ├── stores/        # Zustand stores (auth, guides)
│   │   ├── lib/           # API client, utils
│   │   ├── config/        # Env types, constants
│   │   ├── layouts/       # AppLayout
│   │   └── types/         # TypeScript types
│   └── vite.config.ts     # Dev proxy: /api -> localhost:3001
│
├── server/                # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── routes/        # API routes (auth, guides, ai, payments, analytics, upload)
│   │   ├── middleware/    # Auth middleware (JWT Bearer token)
│   │   ├── ai/            # Multi-provider AI router
│   │   ├── db/            # Prisma client singleton
│   │   ├── payments/      # ЮKassa integration
│   │   └── index.ts       # Express app entry point
│   └── prisma/            # Prisma schema (DB models)
│
├── nginx/                 # Production Nginx config + SSL
├── scripts/               # Deploy/setup scripts
├── docker-compose.yml     # Dev: postgres + server + frontend
└── docker-compose.prod.yml # Prod: + nginx, no port exposure
```

## Pages (Frontend)

| File | Route | Purpose |
|------|-------|---------|
| `LandingPage.tsx` | `/` | Landing page |
| `LoginPage.tsx` | `/login` | Login |
| `RegisterPage.tsx` | `/register` | Registration |
| `DashboardPage.tsx` | `/dashboard` | Author dashboard (metrics, products list) |
| `CreateGuidePage.tsx` | `/create` | Product creation wizard |
| `EditorPage.tsx` | `/editor/:id?` | WYSIWYG content editor (Tiptap) |
| `AnalyticsPage.tsx` | `/analytics` | Analytics dashboard |
| `SettingsPage.tsx` | `/settings` | User settings |
| `PublicGuidePage.tsx` | `/guide/:slug` | Public product page (with paywall) |
| `AuthorProfilePage.tsx` | `/u/:nickname` | Author public profile |
| `CatalogPage.tsx` | `/catalog` | Marketplace/catalog of guides |

## API Routes (Backend)

| File | Prefix | Endpoints |
|------|--------|-----------|
| `routes/auth.ts` | `/auth` | `POST /login`, `POST /register` |
| `routes/guides.ts` | `/guides` | CRUD: `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/publish` |
| `routes/ai.ts` | `/ai` | `POST /structure`, `POST /generate`, `POST /improve`, `POST /suggest-price`, `POST /cover` |
| `routes/payments.ts` | `/payments` | `POST /create`, `POST /verify`, `POST /webhook` |
| `routes/analytics.ts` | `/analytics` | `POST /track`, `GET /aggregate` |
| `routes/upload.ts` | `/upload` | File upload (multer) |

## Key Flows

### Auth Flow
1. Frontend: user fills login/register form → `api.ts` sends POST to `/api/auth/login` or `/api/auth/register`
2. Vite proxy strips `/api` prefix → backend receives `/auth/login`
3. Backend validates with Zod, hashes password with bcryptjs, creates JWT, returns token
4. Frontend stores token, Zustand `authStore` updates state
5. Subsequent requests include `Authorization: Bearer <token>` header

### Guide Creation Flow
1. User clicks "New Product" → `CreateGuidePage` (wizard) or `EditorPage` (direct)
2. Editor uses Tiptap with custom extensions: `callout`, `imageCaption`, `paidBlock`, `paidText`
3. Auto-save debounced every 2-3 seconds → `PUT /guides/:id`
4. Publish → `POST /guides/:id/publish` → generates public slug

### Purchase Flow
1. Visitor opens `PublicGuidePage` → sees preview (free sections + paywall blur)
2. Clicks "Buy" → `POST /payments/create` → creates ЮKassa payment
3. User redirected to ЮKassa checkout
4. ЮKassa webhook → `POST /payments/webhook` → backend verifies, creates order, unlocks content
5. User redirected back → sees full guide

## State Management (Zustand)

| Store | State | Purpose |
|-------|-------|---------|
| `authStore.ts` | user, token, isAuthenticated, login(), logout() | Auth state |
| `guideStore.ts` | guides, currentGuide, loading, fetchGuides(), createGuide() | Guide CRUD state |

## Database Schema (Prisma)

Main models: `Profile`, `Guide`, `GuideSection`, `Order`, `AnalyticsEvent`

Key relations:
- `Profile` 1:N `Guide` (author)
- `Guide` 1:N `GuideSection`
- `Profile` 1:N `Order` (buyer)
- `Guide` 1:N `Order`

## AI Multi-Provider Router (`server/src/ai/`)

Fallback chain: OpenAI → Anthropic → Gemini → Groq
- `ai/index.ts` — router logic, tries providers in order
- `ai/providers.ts` — provider configurations

## Known Issues & Fixes (see TROUBLESHOOTING.md)

- **CORS/Proxy**: Vite proxy configured in `vite.config.ts`, `API_URL = '/api'` in `api.ts`
- **MVP gaps**: Checkout страница с ЮKassa, страница чтения после покупки

## How to Run

### Dev (local)
```bash
# Frontend
cd guidehub && npm install && npm run dev  # → localhost:5173

# Backend
cd server && npm install && npm run dev  # → localhost:3001

# Database (Docker)
docker compose up -d postgres  # → localhost:5432
```

### Dev (Docker Compose)
```bash
docker compose up -d
```

### Prod
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
