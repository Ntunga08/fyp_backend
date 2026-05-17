FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy Prisma config + schema, then generate client at build time
COPY prisma.config.ts ./
COPY prisma ./prisma

# Dummy URL so `prisma generate` succeeds without a real DB at build time
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN pnpm exec prisma generate

# Copy the rest of the source
COPY . .

EXPOSE 3000

# At container start: apply any pending migrations, then launch the server
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec tsx server.ts"]
