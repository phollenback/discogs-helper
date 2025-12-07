# Multi-stage Dockerfile for TypeScript Node.js backend

# Base stage - install dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Test stage - runs tests (can be skipped with --target)
FROM base AS test
ARG SKIP_TESTS=false

# Copy test files and run tests (unless skipped)
COPY tests/ ./tests/
COPY jest.config.js ./

# Run tests only if not skipped
RUN if [ "$SKIP_TESTS" = "false" ]; then npm test; else echo "Skipping tests"; fi

# Runtime stage - production ready
FROM node:20-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src/ ./src/

# Install ts-node globally for runtime TypeScript execution and curl for health checks
RUN npm install -g ts-node typescript && \
    apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]
