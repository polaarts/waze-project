FROM node:20.14

RUN apt-get update && apt-get install -y \
    gconf-service libasound2 libatk1.0-0 libcups2 libdbus-1-3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 \
    libpango-1.0-0 libxcb1 libxtst6 libnss3 libxss1 libatk-bridge2.0-0 \
    libatspi2.0-0 --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*
    
WORKDIR /

COPY package*.json ./ 

RUN npm install 

COPY . . 

CMD [ "node", "index.js" ]