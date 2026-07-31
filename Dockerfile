# ═══════════════════════════════════════════════════════════════════════════════
# Restaurant Management System — Root Dockerfile
# Azure App Service deployment (single container)
#
# Architecture:
#   Stage 1 (frontend-builder) — builds the React/Vite app
#   Stage 2 (backend-builder)  — installs deps + generates Prisma client
#   Stage 3 (runner)           — Node.js serves the API; Nginx is NOT used here
#                                The Express backend serves the built frontend
#                                as static files and exposes port 8080.
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend

COPY Frontend/package*.json ./
RUN npm install

COPY Frontend/ .
RUN npm run build

# ── Stage 2: Install backend dependencies + generate Prisma client ─────────────
FROM node:18-alpine AS backend-builder
WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

# Generate Prisma client targeting linux/alpine
RUN npx prisma generate

# ── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Native build tools needed for bcrypt bindings
RUN apk add --no-cache python3 make g++

# Copy production node_modules and Prisma client from builder
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy backend source
COPY backend/ .

# Copy built frontend into the public folder so Express can serve it
COPY --from=frontend-builder /frontend/build ./public/frontend

EXPOSE 8080

# Run Prisma migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
