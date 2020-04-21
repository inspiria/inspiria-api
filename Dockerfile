FROM node:12
WORKDIR /usr/app

COPY src .
RUN npm install

ENV NODE_ENV='production'
EXPOSE 8080
CMD [ "node", "app.js" ]
