FROM node:12
WORKDIR /usr/app

COPY src .
RUN npm install

ENV NODE_ENV='production'
USER node
EXPOSE 8080
CMD [ "node", "app.js" ]