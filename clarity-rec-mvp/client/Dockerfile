FROM node:20 AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .

RUN npx vue-tsc --noEmit && npx vite build

FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
