
FROM node:20-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (better Docker layer caching)
# If these files don't change, Docker reuses the cached layer
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install

# Copy prisma schema before generating client
COPY prisma ./prisma

# Generate Prisma client (must run after node_modules are installed)
RUN pnpm exec prisma generate

# Copy the rest of the source code
COPY . .

# Expose the port your Express server listens on
EXPOSE 3000

# Start the server using tsx (runs TypeScript directly — no compile step needed)
CMD ["pnpm", "exec", "tsx", "src/server.ts"]