FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY sql ./sql

RUN mkdir -p /app/generated-files

EXPOSE 3001

CMD ["npm", "start"]