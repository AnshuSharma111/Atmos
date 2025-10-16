FROM node:20-bullseye-slim

# Install security updates
RUN apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only server dependencies (skip optional dependencies that may fail)
RUN npm install --omit=dev --omit=optional --legacy-peer-deps && npm cache clean --force

# Copy server files only (not React Native files)
COPY config.js ./
COPY server.js ./
COPY socket-handlers.js ./
COPY viewer.html ./
COPY index.html ./
COPY public/ ./public/

# Create non-root user
RUN useradd -m -u 1001 nodeuser && chown -R nodeuser:nodeuser /app
USER nodeuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/debug', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]