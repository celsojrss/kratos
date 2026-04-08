FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

CMD ["/bin/sh", "-c", "echo \"window._env_ = { VITE_HOST_ID: '$HOSTNAME', VITE_APP_VERSION: '2.9.0' };\" > /usr/share/nginx/html/env-config.js && nginx -g \"daemon off;\""]

EXPOSE 80