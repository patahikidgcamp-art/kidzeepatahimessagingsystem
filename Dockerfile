# Multi-stage Dockerfile for EduNotify School Management & WhatsApp Web Suite
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# Copy source files
COPY . .

# Build Vite frontend assets
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port 3000
EXPOSE 3000

# Start Express server with tsx runtime
CMD ["npm", "start"]
