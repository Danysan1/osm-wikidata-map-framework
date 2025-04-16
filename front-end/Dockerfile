# https://docs.docker.com/language/nodejs/build-images/
FROM node:23.11.0-alpine3.20
WORKDIR /npm_app

COPY ["package.json", "package-lock.json", "/npm_app/"]
RUN npm clean-install

COPY "app" "/npm_app/app"
COPY "src" "/npm_app/src"
COPY "public" "/npm_app/public"
COPY ["tsconfig.json", "declarations.d.ts", "next.config.mjs", "i18n.json", "/npm_app/"]
RUN npm run build && \
    npm install --omit=dev

CMD ["npm", "run", "start"]
