# AGENTS.md

## Monorepo Structure

```
faceless/
├── apps/backend/       # Hono API server (port 3001)
├── apps/frontend/      # Next.js 15 App Router (port 3000)
├── packages/shared/    # Types, Zod validators, constants
├── turbo.json
└── pnpm-workspace.yaml
```

Workspace package names: `@faceless/backend`, `@faceless/frontend`, `@faceless/shared`.

## Dev Commands

```bash
pnpm dev              # Run both apps via Turborepo
pnpm dev --filter @faceless/backend   # Backend only
pnpm dev --filter @faceless/frontend  # Frontend only
pnpm lint             # ESLint across all packages
pnpm check-types      # tsc --noEmit across all packages
pnpm test             # Vitest across all packages
pnpm test --filter @faceless/backend  # Backend tests only
pnpm db:generate      # Generate Drizzle migration SQL
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio
```

## Backend (Hono + Drizzle + BullMQ)

### Environment Variables
Copy `apps/backend/.env.example` to `apps/backend/.env`. Required: `DATABASE_URL`, `REDIS_URL`, `FIREBASE_*`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `DASHSCOPE_API_KEY`, `R2_*`.

AI model config (all in `.env`):
- `AI_TEXT_MODEL` — LLM model name (default: `qwen-plus`)
- `AI_IMAGE_MODEL` — Image gen model (default: `wan2.7-image-pro`)
- `AI_VIDEO_MODEL` — Video gen model (default: `happyhorse-1.1-i2v`)
- `AI_TEXT_PROVIDER` / `AI_IMAGE_PROVIDER` / `AI_VIDEO_PROVIDER` — `dashscope` or `openrouter`

### Drizzle Migrations
```bash
pnpm db:generate   # Generate migration from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:studio     # Visual DB browser
```

### Docker Compose (API + Redis + Worker)
```bash
docker compose -f apps/backend/docker-compose.yml up -d   # Start all services
docker compose -f apps/backend/docker-compose.yml logs -f # Follow logs
docker compose -f apps/backend/docker-compose.yml down    # Stop all services
```

Services: `api` (port 3001), `worker` (BullMQ consumer), `redis` (queue broker). Requires external Postgres via `DATABASE_URL` in `.env`.

### Queue Workers
Workers run in a separate process via `apps/backend/src/worker.ts`. In dev, run alongside the API server:
```bash
pnpm dev --filter @faceless/backend          # API server
pnpm --filter @faceless/backend dev:worker   # Worker process
```

### Auth Flow
1. Firebase Auth on frontend issues ID token
2. All API requests include `Authorization: Bearer <firebase-id-token>`
3. `authMiddleware` verifies token via `firebase-admin`, sets `c.var.userId`
4. Backend issues own JWT for session management

### R2 Media Storage
- Upload via `@aws-sdk/client-s3` with Cloudflare R2 endpoint
- Public URLs: `https://cdn.solutip.com/{path}` (R2 custom domain)
- Import: `import { uploadFile, downloadAndStoreVideoUrl } from "@/lib/storage"`

## AI Pipeline (Mastra)

### Agent pattern
Agents use `@ai-sdk/openai-compatible` to create `LanguageModelV1` instances from env-configured model names. Agent `model` is always a LanguageModelV1, never a raw string.

### Workflows (Mastra `createWorkflow` + `createStep`)
- `generateImageWorkflow` — Single image generation via DashScope/OpenRouter
- `generateVideoWorkflow` — Key-frame images → video clips via DashScope HappyHorse
- `generateContentWorkflow` — Script generation → text/slide content

### Provider factory (`lib/providers/`)
- `types.ts` — `TextProvider`, `ImageProvider`, `VideoProvider` interfaces
- `dashscope.ts` — DashScope API (text: qwen-plus, image: wan2.7, video: happyhorse)
- `openrouter.ts` — OpenRouter API fallback
- `factory.ts` — `getProviders()` resolves provider from `AI_*_PROVIDER` env vars

### DashScope pattern
Image/video generation is async: submit task → poll `task_id` until `SUCCEEDED` → download result → upload to R2.

## Frontend (Next.js + React Query + Zustand)

### State Management Rules
- **React Query**: All server state (projects, contents, jobs, versions). Never cache server data in Zustand.
- **Zustand**: Client-only state (editor draft, UI state). Stores in `apps/frontend/src/stores/`.

### Firebase Auth
- Client-side auth via `firebase/auth`
- `AuthGuard` component wraps authenticated routes
- `useAuth` hook in `apps/frontend/src/hooks/useAuth.ts`
- Auth token attached to API client via axios interceptor

### API Client
- Single axios instance at `apps/frontend/src/lib/api.ts`
- Base URL from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`)
- Auto-attaches Firebase token, handles 401 → redirect to login

### Content Types
```
image  → Single AI-generated image + caption
slide  → Multi-image carousel/slide deck
video  → Short video with voiceover + captions
text   → AI-generated text post
```

### Platform Aspect Ratios
```
tiktok     → 9:16 (1080x1920)
instagram  → 1:1 (1080x1080) or 4:5 (1080x1350)
facebook   → 16:9 (1920x1080) or 1:1
```

## Shared Package

`@faceless/shared` exports:
- `types/` — `ContentType`, `Platform`, `ContentStatus`, `GenerationJob`, API DTOs
- `validators/` — Zod schemas for API request/response validation
- `constants/` — Platform specs, content limits, supported formats

Import: `import { ContentType, createContentSchema } from "@faceless/shared"`

## Conventions

- **No default exports** — Use named exports everywhere.
- **File naming**: kebab-case for files, PascalCase for components/classes, camelCase for functions/variables.
- **Route handlers**: Thin controllers in `routes/`, business logic in `services/`.
- **Database access**: Always through Drizzle service layer, never raw SQL in routes.
- **Error handling**: Hono's `onError` middleware catches all. Services throw typed errors.
- **No `.env` files committed** — Use `.env.example` with placeholder values.
- **CDN URLs**: All generated media served via `https://cdn.solutip.com` (Cloudflare R2).
- **Mastra tools**: `execute` receives `ctx` with `ctx.context` for parsed input data.
- **Mastra agents**: `model` must be a `LanguageModelV1` instance (via `@ai-sdk/openai-compatible`), not a string.
