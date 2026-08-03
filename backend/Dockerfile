# Dockerfile do backend AutoFlux (Node.js/Express)
FROM node:20-alpine

WORKDIR /usr/src/app

# postgresql16-client fornece o pg_dump usado pelo backup automático
# (Etapa 5) — a versão precisa acompanhar a do serviço "postgres" no
# docker-compose.yml (postgres:16-alpine) para evitar incompatibilidade.
RUN apk add --no-cache postgresql16-client

# Copia apenas os manifests primeiro para aproveitar o cache de camadas
# do Docker — só reinstala dependências se package.json mudar.
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY . .

# Pastas usadas para logs (Winston), arquivos de mídia (multer) e
# backups do banco (pg_dump, Etapa 5)
RUN mkdir -p logs uploads backups

EXPOSE 3333

CMD ["node", "src/server.js"]
