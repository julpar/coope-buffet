FROM node:22-alpine AS builder
WORKDIR /repo

# Install workspace deps from monorepo root for better caching
COPY package.json package-lock.json* turbo.json ./
COPY app-staff/package.json app-staff/package.json
RUN npm install

# Copy only the app sources and build the specific workspace
COPY app-staff ./app-staff
RUN npm run build -w app-staff

FROM nginx:1.27-alpine AS runtime
COPY app-staff/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /repo/app-staff/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
