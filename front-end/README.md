# OSM-Wikidata Map Framework front-end

This is a [Next.js](https://nextjs.org/)+Typescript project that is responsible for rendering the front-end of OWMF-based projects, the actual map that you can use to explore the data.

Used libraries include
* [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) and [react-map-gl](https://visgl.github.io/react-map-gl/) for the map
* [i18next](https://www.i18next.com/) for internationalization
* [chart.js](https://www.chartjs.org/) for the charts
* [osmtogeojson](http://tyrasd.github.io/osmtogeojson/) to handle Overpass output
* [wikibase-rest-api-ts](https://www.npmjs.com/package/wikibase-rest-api-ts) to interact with Wikidata REST API

The map has different behaviors depending on the zoom level and back-end:
* At low or very low zoom level (zoom < [`threshold_zoom_level`](../.env.example)) with PMTiles vector tiles, only boundaries are shown
* At high zoom level (zoom > [`threshold_zoom_level`](../.env.example)) with PMTiles vector tiles, non-boundary element details are shown
* At very low zoom level (zoom < [`min_zoom_level`](../.env.example)) with other back-ends, nothing is shown
* At low zoom level (zoom < [`threshold_zoom_level`](../.env.example)) with other back-ends, clustered element counts are shown
* At high zoom level (zoom > [`threshold_zoom_level`](../.env.example)) with other back-ends, non-boundary element details are shown

The API code used to connect to Mediawiki API, WDQS and QLever is automatically generated from the OpenAPI specification files in [`/openapi/`](../openapi/) through `npm run generate` into [`src/generated/`](./src/generated/).

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

In order to run an instance its configuration must be set in `.env` or `.env.local`.
You can copy it from the template file [`.env.example`](../.env.example).

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

In order to build a deployable instance its configuration must be set in `.env` or `.env.production`.
You can copy it from the template file [`.env.example`](../.env.example).

You will also need to specify [a token/key in `.env` for the background map](../.env.example#L45) (either `mapbox_token`, `maptiler_key`, `enable_stadia_maps` or `jawg_token`).

If you want to use [Sentry](https://sentry.io/welcome/) you need to create a JS Sentry project and set [the `sentry-*` parameters in `.env`](../.env.example#L122) according with the values you can find in `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/keys/` and `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/security-headers/csp/`.

### Static deployment

If `owmf_static_export` is `true` and you run `npm run build` a static export ready for production deployment of your OWMF instance will be generated in the [out](./out) folder.
You can then simply copy that folder into the web root of any web server like Nginx or Apache httpd.

For more details see [the Static exports documentation of Next.js](https://nextjs.org/docs/pages/building-your-application/deploying/static-exports)

### Dynamic deployment

If `owmf_static_export` is NOT `true` and you run `npm run build`, you can then copy the whole front-end folder to your target machine (where Node.js must be installed) and then run in the new folder `npm run start` to start the Next.js web server.

For more details see [the Deploying documentation of Next.js](https://nextjs.org/docs/pages/building-your-application/deploying#nodejs-server)
