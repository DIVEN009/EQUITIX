# ==========================================
# Equitix Frontend Production Dockerfile
# Stage 1: Build static bundle with Node.js
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy application source files
COPY . .

# Build production distribution bundle
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Static Server
# ==========================================
FROM nginx:alpine AS runner

# Remove default nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
