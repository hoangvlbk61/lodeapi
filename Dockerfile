# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./

# Cài tools build native (tránh lỗi node-gyp)
RUN apk add --no-cache python3 make g++

# Cài dependencies sạch sẽ
RUN npm ci --omit=dev

# Production stage
FROM node:18-alpine

WORKDIR /app

# Tạo non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules từ builder
COPY --from=builder /app/node_modules ./node_modules

# Copy toàn bộ source code
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]