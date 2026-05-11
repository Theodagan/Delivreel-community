FROM node:20-alpine

WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy only package.json first to leverage Docker cache
COPY package*.json ./

# Install deps
RUN npm install

# Copy app source code (everything else)
COPY . .

EXPOSE 4200

# Start Angular dev server with polling for Docker
CMD ["sh", "-c", "ng serve --host 0.0.0.0 --poll 2000 --port ${FRONTEND_PORT:-4200}"]
