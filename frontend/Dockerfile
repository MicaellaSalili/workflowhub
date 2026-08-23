# -----------------------------------------------------------------------------
# Multi-Stage Dockerfile for Angular Standalone Frontend Application
# -----------------------------------------------------------------------------

# Stage 1: Build Angular production distribution
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build -- --configuration production

# Stage 2: Serve via High-Performance Nginx Web Server
FROM nginx:1.27-alpine AS runtime

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled Angular app from build stage
COPY --from=build /app/dist/workflowhub-frontend/browser /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback & API reverse proxy support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security headers & non-root permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
