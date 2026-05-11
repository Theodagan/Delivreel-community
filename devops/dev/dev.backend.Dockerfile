FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including Python for node-gyp and FFmpeg
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
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Install global NestJS CLI
RUN npm install -g @nestjs/cli

# Copy package files
COPY package*.json ./

# Set Python env for node-gyp
ENV PYTHON=/usr/bin/python3
ENV npm_config_python=/usr/bin/python3

# Install all dependencies including devDependencies
RUN npm install

# Copy source code
COPY . .

# Create necessary folders with proper permissions
RUN mkdir -p uploads hls && \
    chmod 755 uploads hls

# Expose port
EXPOSE 3000

# Default command: run NestJS with hot reload
CMD ["npm", "run", "start:dev"]