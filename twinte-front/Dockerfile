ARG BUN_VERSION=1.1.22
FROM oven/bun:${BUN_VERSION}-slim AS builder
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun --env-file=.env.course vite build --mode course

FROM nginx AS deploy
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
