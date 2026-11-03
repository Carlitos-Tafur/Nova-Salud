FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server
COPY frontend ./frontend

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/server
CMD ["node", "src/server.js"]