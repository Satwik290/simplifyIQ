# ==========================================
# STAGE 1: BUILD THE APPLICATION
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json tsconfig.json ./

# Install all dependencies (development + production) for compilation
RUN npm install

# Copy source code and files
COPY src ./src

# Compile TypeScript to JavaScript in /dist folder
RUN npm run build


# ==========================================
# STAGE 2: PRODUCTION RUNNER ENVIRONMENT
# ==========================================
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled files and package config from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies to keep bundle extremely light
RUN npm ci --only=production

# Create standard empty local data directory for JSON database persistence
RUN mkdir -p data

EXPOSE 3001
CMD ["npm", "start"]
