FROM node:20-alpine
WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm ci --omit=dev

# Código fuente
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]