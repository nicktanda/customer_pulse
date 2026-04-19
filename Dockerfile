# syntax=docker/dockerfile:1
# Production image: Next.js web app only. Run `apps/worker` separately for BullMQ.
FROM node:20-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json
RUN yarn install --frozen-lockfile

COPY apps/web apps/web
COPY packages/db packages/db
COPY scripts scripts

ARG AUTH_SECRET=build-placeholder-min-32-characters-long
ENV AUTH_SECRET=${AUTH_SECRET}
ENV NEXTAUTH_URL=http://localhost:3000
RUN yarn build:web

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "yarn workspace web start"]
