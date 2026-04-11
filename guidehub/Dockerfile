FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Dev command: vite with host 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
