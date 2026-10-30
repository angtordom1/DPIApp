# Stage 1: build Vue SPA
FROM node:22-alpine AS build-vue
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Express API server
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ .
COPY --from=build-vue /build/server/public ./public/
# unprivileged user; it only writes the temporary uploads
RUN mkdir uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["node", "server.js"]
