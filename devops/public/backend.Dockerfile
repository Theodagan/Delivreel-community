FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including Python setuptools for node-gyp
RUN apk update --no-cache && \
    apk add --no-cache \
    python3 \
    py3-setuptools \
    python3-dev \
    make \
    g++ \
    curl \
    sqlite \
    sqlite-dev \
    && rm -rf /var/cache/apk/*

# Install FFmpeg 
RUN apk add --no-cache ffmpeg

# Install global CLI
RUN npm install -g @nestjs/cli

# Copy package files
COPY package*.json ./

# Set environment variables for node-gyp and Python
ENV PYTHON=/usr/bin/python3
ENV npm_config_python=/usr/bin/python3

# Install dependencies (use npm install since we don't have package-lock.json)
RUN npm install --omit=dev --no-optional || \
    (npm cache clean --force && npm install --omit=dev --no-optional)

# Copy source code
COPY . .

# Install dev dependencies for build
RUN npm install --only=development

# Create necessary directories with proper permissions
RUN mkdir -p uploads hls && \
    chmod 755 uploads hls

# Build the application without reusing copied incremental state
RUN rm -rf dist tsconfig.tsbuildinfo && npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

# Create database file with proper permissions
RUN touch database.sqlite && chmod 666 database.sqlite

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD sh -c 'curl -f "http://localhost:${BACKEND_BIND_PORT:-3000}/health" || exit 1'

# Start the application
CMD ["npm", "run", "start:prod"]
