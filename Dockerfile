# One image for every DPCO install; each install is configured by deploy/.env (see deploy/README.md).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Read at startup by lib/db.ts to create or update the schema.
COPY --from=build /app/lib/schema.sql ./lib/schema.sql
RUN mkdir -p data/files && chown -R node:node data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
