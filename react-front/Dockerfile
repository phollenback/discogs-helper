# ---- Build stage ----
    FROM node:20-alpine AS build
    WORKDIR /app
    COPY package*.json ./
    
    # For reproducible builds
    RUN npm ci
    
    # Copy source
    COPY . .
    
    # Accept build-time API URL for production
    # Empty string means use relative URLs (nginx proxies /api to backend)
    ARG REACT_APP_API_URL=
    ENV REACT_APP_API_URL=$REACT_APP_API_URL
    
    # Build the static site:
    # If Create React App: npm run build (outputs to /app/build)
    # If Vite: npm run build (outputs to /app/dist)
    RUN npm run build
    
    # ---- Serve with Nginx ----
    FROM nginx:alpine AS serve
    # Optional: custom nginx config for SPA routing & headers
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # CRA build -> /app/build ; Vite build -> /app/dist
    # Adjust the path if your tool differs
    COPY --from=build /app/build /usr/share/nginx/html
    # If Vite:
    # COPY --from=build /app/dist /usr/share/nginx/html
    
    EXPOSE 80 443
    CMD ["nginx", "-g", "daemon off;"]
    