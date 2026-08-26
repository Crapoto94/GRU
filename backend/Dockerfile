FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libreoffice ghostscript

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads/documents uploads/templates

EXPOSE 3000

CMD ["node", "src/server.js"]
