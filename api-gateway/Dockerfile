FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --strict-ssl=false
COPY . .
EXPOSE 8080
CMD ["node", "src/server.js"]
