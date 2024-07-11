# https://docs.docker.com/language/nodejs/build-images/
FROM node:22.4.1-alpine3.20
COPY "./" "/npm_app"

WORKDIR /npm_app
RUN npm clean-install && \
    npm run build && \
    npm clean-install --omit=dev
CMD ["npm", "run", "start"]
