FROM node:20

WORKDIR /src

COPY src/package*.json ./

RUN npm install 

COPY ./src ./src

ENV GOOGLE_APPLICATION_CREDENTIALS=/src/service-account.json
ENV NODE_ENV=production

COPY ./service-account.json /src/service-account.json

EXPOSE 8080

CMD ["node", "src/index.js"]
