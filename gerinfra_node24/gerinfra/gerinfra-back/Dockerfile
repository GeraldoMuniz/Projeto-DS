FROM node:24-alpine AS base

# O Prisma escolhe a engine pela versão do `openssl`; sem o binário, a
# node:alpine cai no fallback 1.1.x, cuja libssl não existe na imagem.
RUN apk add --no-cache openssl

# ---- Development ----
FROM base AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# ---- Build ----
FROM base AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build

# ---- Production ----
FROM base AS production

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# --ignore-scripts: o `prepare` chama o husky, que é devDependency e não
# existe aqui (npm ci falharia com exit 127).
RUN npm ci --omit=dev --ignore-scripts
# Client já gerado no estágio de build (com --ignore-scripts, os
# postinstall do Prisma não rodam aqui).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
