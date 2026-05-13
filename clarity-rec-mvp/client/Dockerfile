FROM node:20 AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Явная переустановка vue-tsc для корректной работы
RUN npm install --save-dev vue-tsc typescript

# Сборка проекта
RUN npx vue-tsc --noEmit && npx vite build

FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
