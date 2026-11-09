# ─── Etapa 1: compilación TypeScript ───
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Etapa 2: imagen de ejecución mínima ───
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tzdata

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY public ./public

USER node
EXPOSE 3000

CMD ["node", "dist/app.js"]
