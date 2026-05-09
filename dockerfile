# Node.js version 20 installed
# alpine → ultra-light Linux version
FROM node:20-alpine


# Create app directory
WORKDIR /app

#enable  package management tools  like  pnpm and yarn
RUN corepack enable

#copies dependency files to the working directory
COPY package.json pnpm-lock.yaml ./

# install all dependencies in a containerized environment,
# ensuring that the exact versions specified in the lockfile are used,
# which promotes consistency across different environments and prevents issues
# related to version mismatches.


RUN pnpm install --frozen-lockfile

#copy the  rest of  the application code to the working directory in the container
COPY . .

#expose port 3000 to allow external access to the application running inside the container.
EXPOSE 3000

CMD ["pnpm", "exec", "tsx", "watch", "src/index.ts"]