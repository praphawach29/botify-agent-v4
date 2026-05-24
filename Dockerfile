# ═══════════════════════════════════════════════════════════
#  BOTIFY AI — Production Dockerfile
# ═══════════════════════════════════════════════════════════
FROM node:18-alpine AS base

# Security: run as non-root
RUN addgroup -S botify && adduser -S botify -G botify

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy application code
COPY server.js ./
COPY views/ ./views/

# Set ownership
RUN chown -R botify:botify /app

USER botify

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/status || exit 1

CMD ["node", "server.js"]
