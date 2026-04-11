FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy prisma schema for client generation
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy tsconfig and source
COPY tsconfig.json ./

# Dev command: tsx watch with migrate deploy on start
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
