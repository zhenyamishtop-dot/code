FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY web ./web
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
VOLUME /data
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
