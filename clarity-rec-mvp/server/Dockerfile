FROM node:20-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .

RUN npx tsc

FROM node:20-alpine AS production-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
