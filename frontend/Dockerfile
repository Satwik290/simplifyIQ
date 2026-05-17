# ==========================================
# STAGE 1: BUILD THE APPLICATION
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies for compilation
RUN npm install

# Copy configuration and source files
COPY tsconfig.json postcss.config.js tailwind.config.js next.config.js ./
COPY app ./app
COPY lib ./lib

# Inject mock API URL so Next.js build succeeds with static parameters
ENV NEXT_PUBLIC_API_URL=http://localhost:3001

# Compile Next.js production bundle
RUN npm run build


# ==========================================
# STAGE 2: PRODUCTION RUNNER ENVIRONMENT
# ==========================================
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled assets and server scripts from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./

# Install only production dependencies
RUN npm ci --only=production

EXPOSE 3000
CMD ["npm", "start"]
