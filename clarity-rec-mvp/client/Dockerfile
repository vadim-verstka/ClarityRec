FROM node:20 AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Явная переустановка vue-tsc и typescript для корректной работы
RUN npm install --save-dev vue-tsc typescript && npm rebuild

# Сборка проекта через прямой вызов node
RUN node ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit && node ./node_modules/vite/bin/vite.js build

FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
