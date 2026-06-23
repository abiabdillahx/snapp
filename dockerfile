FROM oven/bun:canary AS build

WORKDIR /app
COPY ./package.json ./
COPY ./bun.lock ./

RUN bun install --frozen-lockfile
COPY . .

ENV PUBLIC_VERSION=beta-1.0.0

RUN bun --bun run build

FROM node:25-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=1000

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/config ./config
COPY --from=build /app/project.inlang ./project.inlang
COPY --from=build /app/messages ./messages
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/lib/server/db ./src/lib/server/db
COPY --from=build /app/static ./static

RUN npm ci --omit=dev --legacy-peer-deps

ENV PUBLIC_VERSION=beta-1.0.0
ENV SNAPP_DEBUG=false
ENV PORT=1000

EXPOSE 1000

CMD ["node", "-r", "dotenv/config", "./build"]
