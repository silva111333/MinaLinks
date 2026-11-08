FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY *.mjs ./
RUN mkdir /data && chown node:node /data
USER node
ENV DATA_DIR=/data
EXPOSE 8080
CMD ["node","bridge.mjs"]
