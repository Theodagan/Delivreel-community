# --- Build Stage ---
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    COPY apps/frontend/package*.json ./
    RUN npm ci
    
    COPY apps/frontend/ ./
    ARG BUILD_CONFIGURATION=production
    RUN npm run build -- --configuration=${BUILD_CONFIGURATION}
    
    # --- Production Stage ---
    FROM nginx:alpine
    
    # Copy built Angular app (updated path)
    COPY --from=builder /app/dist/browser  /usr/share/nginx/html
    
    # Nginx config
    COPY devops/public/nginx-frontend.conf /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
