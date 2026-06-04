FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY schemas ./schemas
COPY templates ./templates
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY schemas ./schemas
COPY templates ./templates
COPY migrations ./migrations
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/api/v1/health || exit 1
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
