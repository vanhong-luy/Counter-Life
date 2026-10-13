FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
ENV ADMIN_API_URL=http://admin-api:8081
ENV USER_API_URL=http://user-api:8082
ENTRYPOINT ["node", "server.js"]
