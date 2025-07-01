FROM node:20-slim

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends libsqlite3-dev python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --production

COPY . .

RUN npm rebuild better-sqlite3

ENV NODE_ENV=production
ENV ELASTICSEARCH_HOST=http://elasticsearch:9200
ENV ES_INDEX=waze-events
ENV ES_CACHE_INDEX=waze-cache-metrics
ENV ES_PIG_INDEX=waze-pig-metrics
ENV PORT=3000

CMD ["node", "server.js"]
