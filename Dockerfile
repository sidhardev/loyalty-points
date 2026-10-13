# Regularhood: builds the website and API, then runs them as one server on port 4000.
# The database lives in /app/server/data — mount a volume there, or every redeploy starts empty.

FROM node:22.23.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22.23.1-bookworm-slim
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/scripts ./server/scripts
COPY --from=build /app/web/dist ./web/dist
WORKDIR /app/server
RUN mkdir -p data && chown -R node:node /app/server/data
USER node
VOLUME /app/server/data
EXPOSE 4000
CMD ["node", "--no-warnings", "dist/main.js"]
