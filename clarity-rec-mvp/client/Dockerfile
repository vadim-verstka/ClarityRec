FROM node:20-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Явная переустановка vue-tsc для корректной работы в alpine
RUN npm install --save-dev vue-tsc typescript

# Сборка проекта
RUN ./node_modules/.bin/vue-tsc --noEmit && ./node_modules/.bin/vite build

FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
