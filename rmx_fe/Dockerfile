FROM node:20

WORKDIR /app

COPY package.json package.json

RUN npm install

COPY  postcss.config.js server.js tailwind.config.ts tsconfig.json vite.config.ts ./
COPY ./app ./app
COPY ./public/ ./public/

RUN npm run build

ENTRYPOINT ["/bin/sh", "-c", "npm", "run", "start"]
