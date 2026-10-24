FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm ci
RUN npm run build:packages
RUN npm run build --workspace=@repolens/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
