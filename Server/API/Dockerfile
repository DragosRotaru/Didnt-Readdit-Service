FROM node:latest

RUN groupadd -r app && useradd -r -g app app

RUN mkdir -p /usr/app/workdir
WORKDIR /usr/app/workdir

COPY package.json /usr/src/workdir/
RUN npm install

COPY . /usr/src/workdir

EXPOSE 8080

CMD [ "node", "server.js" ]
