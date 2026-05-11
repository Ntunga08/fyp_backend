FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy everything else
COPY . .

EXPOSE 3000

CMD ["pnpm", "exec", "tsx", "server.ts"]