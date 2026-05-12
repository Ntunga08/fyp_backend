FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

# Copy prisma config and schema
COPY prisma.config.ts ./
COPY prisma ./prisma

# Set a dummy DATABASE_URL for build time (will be overridden at runtime)
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edutrack"

# Generate Prisma client
RUN npx prisma generate

# Copy everything else
COPY . .

EXPOSE 3000

CMD ["pnpm", "exec", "tsx", "server.ts"]