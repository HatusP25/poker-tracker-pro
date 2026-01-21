# Stage 1: Build Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
RUN npm ci

# Copy client source and build
COPY client/ ./
RUN npm run build

# Stage 2: Build Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
RUN npm ci

# Copy Prisma schema first (for generation)
COPY server/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy server source
COPY server/src ./src
COPY server/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client for production
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy built server from server-builder
COPY --from=server-builder /app/server/dist ./dist

# Copy built client from client-builder
COPY --from=client-builder /app/client/dist ./public

# Copy startup script
COPY server/start.sh ./start.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    chmod +x ./start.sh

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command - use startup script with better error handling
CMD ["sh", "./start.sh"]
