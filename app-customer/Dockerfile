FROM node:22-alpine AS builder
WORKDIR /repo

# Install workspace deps from monorepo root for better caching
COPY package.json package-lock.json* turbo.json ./
COPY app-customer/package.json app-customer/package.json
RUN npm install

# Copy only the app sources and build the specific workspace
COPY app-customer ./app-customer

# Accept Vite build-time env args for API base/version and expose them during build
# This mirrors app-staff so docker-compose can pass API settings via build args.
ARG VITE_SERVICE_URL_APP
ARG VITE_API_VERSION
ENV VITE_SERVICE_URL_APP=${SERVICE_URL_APP}
ENV VITE_API_VERSION=${API_VERSION}
RUN npm run build -w app-customer

FROM nginx:1.27-alpine AS runtime
COPY app-customer/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /repo/app-customer/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
