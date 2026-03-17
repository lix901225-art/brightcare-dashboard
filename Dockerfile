# BrightCare OS Dashboard — Production Dockerfile
# Uses Next.js standalone output for minimal image size.
#
# Build:  docker build -t brightcare-dashboard .
# Run:    docker run -p 3000:3000 -e API_BASE_URL=http://api:4000 brightcare-dashboard

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Next.js standalone output produces a self-contained server
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
