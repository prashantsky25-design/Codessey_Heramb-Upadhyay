# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/proof/package.json ./packages/proof/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build all packages and apps
RUN npm run build

# Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# Copy built artifacts and node_modules from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/proof/package.json ./packages/proof/
COPY --from=builder /app/packages/proof/dist ./packages/proof/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/deployed-addresses.json ./deployed-addresses.json

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
