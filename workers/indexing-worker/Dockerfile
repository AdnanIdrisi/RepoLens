FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages ./packages
COPY workers/indexing-worker ./workers/indexing-worker

RUN npm ci
RUN npm run build:packages
RUN npm run build --workspace=@repolens/indexing-worker

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/workers/indexing-worker/dist ./workers/indexing-worker/dist
COPY --from=builder /app/workers/indexing-worker/package.json ./workers/indexing-worker/package.json

CMD ["node", "workers/indexing-worker/dist/worker.js"]
