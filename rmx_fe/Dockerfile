FROM node:20

WORKDIR /app

COPY package.json package.json

RUN npm install

COPY . .

RUN npm run build

ENTRYPOINT ["/bin/sh", "-c", "npm", "run", "start"]
