FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/backend/ apps/backend/
COPY packages/shared/ packages/shared/

RUN pnpm --filter @faceless/shared build
RUN pnpm --filter @faceless/backend build

RUN pnpm deploy --filter @faceless/backend /app/deploy

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/deploy .
RUN npm install -g tsx
EXPOSE 3001
ENTRYPOINT ["tsx"]
CMD ["dist/index.js"]