FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Baked into the JS bundle at build time. "/api" = same origin, Caddy proxies it to the backend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
