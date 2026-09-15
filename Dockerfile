# Build: gera o bundle estatico (tsc -b && vite build)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: so o resultado estatico, servido pelo nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 127.0.0.1, nao localhost: o nginx so escuta em IPv4 (nginx.conf custom faz o
# entrypoint pular o script que habilitaria "listen [::]:80"), e o wget do
# Alpine resolve localhost para ::1 primeiro, causando "connection refused".
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1
