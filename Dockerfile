FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -S cumond && adduser -S cumond -G cumond
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force
USER cumond
EXPOSE 3200
ENV PORT=3200
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3200/api/health || exit 1
CMD ["node", "build"]
