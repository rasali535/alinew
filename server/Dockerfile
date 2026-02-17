# ==========================================
# Stage 1: Builder
# Compiles TypeScript and installs dependencies
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# Install necessary build tools (if needed for native modules)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and scripts
COPY src ./src
COPY scripts ./scripts

# Build TypeScript to dist/
RUN npm run build

# Copy static assets (like data files)
COPY src/data dist/data

# Prune dev dependencies to keep image small
RUN npm prune --production

# ==========================================
# Stage 2: Production
# Minimal runtime image
# ==========================================
FROM node:20-slim AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
USER node

# Copy built artifacts from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./

# Set Environment Variables (Defaults, can be overridden)
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Use dumb-init as entrypoint to handle signals
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]
