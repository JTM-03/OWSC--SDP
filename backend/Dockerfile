# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build (Prisma generate) ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client for the linux/alpine target
RUN npx prisma generate

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only what's needed to run bcrypt native bindings
RUN apk add --no-cache python3 make g++

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy generated Prisma client from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/generated ./src/generated

# Copy application source
COPY . .

# Expose the API port
EXPOSE 5000

# Run database migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
