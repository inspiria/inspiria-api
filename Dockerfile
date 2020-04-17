FROM node:12
WORKDIR /usr/app

COPY src .
RUN npm install
RUN mkdir generated_books && chown node:node generated_books

ENV NODE_ENV='production'
USER node
EXPOSE 8080
CMD [ "node", "app.js" ]