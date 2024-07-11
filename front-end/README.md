# OSM-Wikidata Map Framework front-end

This is a [Next.js](https://nextjs.org/)+Typescript project that is responsible for rendering the front-end of OWMF-based projects, the actual map that you can use to explore the data.
The map is created using [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) and the charts are created using [chart.js](https://www.chartjs.org/).

At very low zoom level (zoom < [`min_zoom_level`](../.env.example)) clustered element counts are shown only for PMTiles and Vector DB sources.

At low zoom level (zoom < [`threshold_zoom_level`](../.env.example)) clustered element counts are shown fol all sources.

At high zoom level (zoom > [`threshold_zoom_level`](../.env.example)) actual elements and their etymologies are shown.

The API code used to connect to Overpass, WDQS and other APIs is automatically generated from the OpenAPI specification files in [`/openapi/`](../openapi/) through `npm run generate` into [`src/generated/`](./src/generated/).

## File structure

Main files and folders:
- [app](./app/) -> The definition of the high level layout and pages
- [public](./public/) -> Static resources deployed as-is in the final output
- [src](./src/) -> 
  - [components](./src/components/) -> Components (modular and independently reusable blocks of interface) used by the pages
  - [context](./src/context/) -> Code used for interfacing with the browser's IndexedDB for caching
  - [generated](./src/generated/) -> Auto-generated code used for interfacing with external APIs
  - [i18n](./src/i18n) -> Code used for the  app internationalization
  - [load-related](./src/i18n) -> Code NOT used by the web app, used instead during DB initialization (through the `registry.gitlab.com/openetymologymap/osm-wikidata-map-framework/load-related` Docker image built with [Dockerfile.load-related](./Dockerfile.load-related))
  - [model](./src/model/) -> Data model Typescript interfaces
  - [services](./src/services/) -> Code responsible for handling the querying of external APIs, transforming the result and combining it with with other sources
- [next.config.mjs](./next.config.mjs) -> Next.js configuration (includes)
- [package.json](./package.json) -> Dependencies and development/build scripts

## Development

To run the local development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
You can start editing the pages and components, the page auto-updates as you edit the files.
To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.



## Deployment

In order to make a deployed instance function correctly all instance settings must be set in `.env`.

You can copy the template file [`.env.example`](../.env.example), while other options should already be ok as a starting point.

If you expose your app on a domain/address different than localhost or 127.0.0.1 you will also need to specify a token/key for the background map (either `mapbox_token`, `maptiler_key`, `enable_stadia_maps` or `jawg_token`).

If you want to use [Sentry](https://sentry.io/welcome/) you need to create a JS and/or PHP Sentry project and set the `sentry-*` parameters according with the values you can find in `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/keys/` and `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/security-headers/csp/`.

### Production deployment with Docker

The latest version can be deployed through Docker using the image [`registry.gitlab.com/openetymologymap/osm-wikidata-map-framework`](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/container_registry/3032190).
```sh
docker run --rm -d  -p 80:80/tcp registry.gitlab.com/openetymologymap/osm-wikidata-map-framework:latest
```

A full installation without DB (using Overpass) can be deployed with docker-compose:
```sh
git clone https://gitlab.com/openetymologymap/osm-wikidata-map-framework.git
cd osm-wikidata-map-framework
cp ".env.example" ".env"
# At this point edit the .env file with the desired settings
docker-compose --profile "prod" up -d
```

A full installation complete with DB can be deployed with docker-compose:
```sh
git clone https://gitlab.com/openetymologymap/osm-wikidata-map-framework.git
cd osm-wikidata-map-framework
cp ".env.example" ".env"
# At this point edit the .env file with the desired settings and set db_enable=true
COMPOSE_PROFILES=prod,db docker-compose up -d
```
At this point you need to load a dump of the DB on the DB exposed on localhost:5432 or initialize it [through the Airflow pipeline](#database-initialization)

<details>
<summary>Deployment diagram</summary>

![deployment diagram](images/deployment/prod.png)

![deployment diagram](images/deployment/prod+db.png)

![deployment diagram](images/deployment/prod+promtail.png)

</details>
