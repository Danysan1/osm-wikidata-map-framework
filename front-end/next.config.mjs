import { withSentryConfig } from "@sentry/nextjs";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const BASE_PATH = undefined,
  STATIC_EXPORT = true,
  CONFIG_KEY_WHITELIST_TO_PASS_TO_CLIENT = [
    "owmf_default_center_lat",
    "owmf_default_center_lon",
    "owmf_default_zoom",
    "owmf_threshold_zoom_level",
    "owmf_min_zoom_level",
    "owmf_default_background_style",
    "owmf_default_color_scheme",
    "owmf_default_language",
    "owmf_source_presets",
    "owmf_qlever_enable",
    "owmf_pmtiles_preset",
    "owmf_pmtiles_base_url",
    "owmf_osm_filter_tags",
    "owmf_osm_text_key",
    "owmf_osm_description_key",
    "owmf_osm_wikidata_keys",
    "owmf_osm_wikidata_properties",
    "owmf_propagate_data",
    "owmf_wikidata_indirect_property",
    "owmf_wikidata_image_property",
    "owmf_wikidata_country",
    "owmf_osm_country",
    "owmf_min_lon",
    "owmf_max_lon",
    "owmf_min_lat",
    "owmf_max_lat",
    "owmf_mapbox_token",
    "owmf_maptiler_key",
    "owmf_enable_stadia_maps",
    "owmf_jawg_token",
    "owmf_preferred_backends",
    "owmf_google_analytics_id",
    "owmf_sentry_js_dsn",
    "owmf_sentry_js_env",
    "owmf_overpass_endpoints",
    "owmf_wikidata_endpoint",
    "owmf_mapcomplete_theme",
    "owmf_i18n_override",
    "owmf_max_map_elements",
    "owmf_cache_timeout_hours",
    "owmf_max_relation_members",
    "owmf_fetch_parts_of_linked_entities",
    "owmf_wikispore_enable",
    "owmf_liberapay_id",
    "owmf_paypal_id",
    "owmf_home_url",
    "owmf_issues_url",
    "owmf_custom_intro_html",
    "owmf_custom_intro_js",
  ];

if (process.env.NODE_ENV === "development")
  console.log("Launching development server");
else if (STATIC_EXPORT)
  console.log("Static export enabled, generating static files to be served with any web server");
else
  console.log("Static export disabled, building dynamic server-side app to be run with `next start`");

const baseEnv = {
  owmf_version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  owmf_base_path: BASE_PATH,
  owmf_static_export: STATIC_EXPORT ? "true" : undefined,
  owmf_i18n_override: existsSync("i18n.json") ? readFileSync("i18n.json", "utf8") : undefined
};
const clientEnv = CONFIG_KEY_WHITELIST_TO_PASS_TO_CLIENT.reduce((acc, key) => {
  if (process.env[key])
    acc[key] = process.env[key];
  return acc;
}, baseEnv);
if (process.env.owmf_source_presets === "all") { // Fill owmf_source_presets with all available presets
  const presetDir = join(process.cwd(), "public", "presets"),
    presetFiles = existsSync(presetDir) ? readdirSync(presetDir) : [],
    allPresets = presetFiles
      .filter(fileName => fileName.endsWith(".json"))
      .map(fileName => fileName.replace(/\.json$/, ""));
  clientEnv.owmf_source_presets = JSON.stringify(allPresets);
}

const csp_enable = process.env.owmf_csp_enable === "true";
function generateCspHeaders() {
  const reportUri = process.env.owmf_sentry_js_uri ? `report-uri ${process.env.owmf_sentry_js_uri}` : "",
    mapboxScript = process.env.owmf_mapbox_token ? " https://api.mapbox.com" : "",
    mapboxConnect = 'https://unpkg.com/@mapbox/' + process.env.owmf_mapbox_token ? ' https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com' : "",
    maptilerConnect = process.env.owmf_maptiler_key ? "https://api.maptiler.com/ https://maputnik.github.io/osm-liberty/ https://orangemug.github.io/font-glyphs/ https://klokantech.github.io/naturalearthtiles/" : "",
    maptilerImg = process.env.owmf_maptiler_key ? "https://cdn.maptiler.com/maptiler-geocoding-control/" : "",
    stadiaConnect = process.env.owmf_enable_stadia_maps === "true" ? 'https://tiles.stadiamaps.com/ https://api.stadiamaps.com/geocoding/' : "",
    jawgConnect = process.env.owmf_jawg_token ? 'https://api.jawg.io/ https://tile.jawg.io/' : "",
    googleAnalyticsImg = process.env.owmf_google_analytics_id ? 'https://*.google-analytics.com https://stats.g.doubleclick.net https://analytics.google.com https://*.analytics.google.com/g/collect https://www.googletagmanager.com https://www.google.com/ads/ga-audiences' : "",
    googleAnalyticsScript = process.env.owmf_google_analytics_id ? 'https://www.googletagmanager.com/gtag/js https://www.google-analytics.com' : "",
    sentryConnect = process.env.owmf_sentry_js_dsn ? 'https://*.ingest.sentry.io' : "",
    sentryScript = process.env.owmf_sentry_js_dsn ? 'https://js.sentry-cdn.com https://browser.sentry-cdn.com' : "",
    matomoConnect = process.env.owmf_matomo_domain ? 'https://' + process.env.owmf_matomo_domain : "",
    matomoScript = process.env.owmf_matomo_domain ? 'https://cdn.matomo.cloud/' : "",
    wikimediaImg = "https://commons.wikimedia.org https://commons.m.wikimedia.org https://upload.wikimedia.org",
    wikimediaConnect = "https://query.wikidata.org/sparql https://*.wikipedia.org/api/rest_v1/page/summary/ https://commons.wikimedia.org/w/api.php https://www.wikidata.org/w/rest.php/wikibase/v0/entities/items/",
    overpassEndpoints = JSON.parse(process.env.owmf_overpass_endpoints);
  if (!overpassEndpoints || !Array.isArray(overpassEndpoints))
    throw new Error("Bad overpass_endpoint configuration");
  const overpassConnect = overpassEndpoints.join(" "),
    payPalForm = process.env.owmf_paypal_id ? 'https://www.paypal.com/donate' : "",
    payPalImg = process.env.owmf_paypal_id ? 'https://www.paypal.com https://www.paypalobjects.com' : "",
    qleverConnect = process.env.owmf_qlever_enable ? 'https://qlever.cs.uni-freiburg.de/api/' : "",
    pmtilesConnect = process.env.owmf_pmtiles_base_url?.startsWith("http://localhost") ? process.env.owmf_pmtiles_base_url : "",
    osmAmericanaConnect = 'https://zelonewolf.github.io/openstreetmap-americana/ https://osm-americana.github.io/fontstack66/ https://tile.ourmap.us/data/ https://*.cloudfront.net/planet/',
    cspHeader = `
    child-src blob: ;
    connect-src 'self' ${wikimediaConnect} ${overpassConnect} ${sentryConnect} ${matomoConnect} ${mapboxConnect} ${maptilerConnect} ${stadiaConnect} ${jawgConnect} ${googleAnalyticsImg} ${qleverConnect} ${pmtilesConnect} ${osmAmericanaConnect} ;
    default-src 'self' ;
    font-src 'self' ;
    form-action 'self' ${payPalForm} ;
    frame-ancestors 'none' ;
    img-src 'self' data: blob: ${wikimediaImg} ${payPalImg} ${googleAnalyticsImg} ${maptilerImg} ;
    object-src 'none';
    script-src 'self' ${sentryScript} ${matomoScript} ${mapboxScript} ${googleAnalyticsScript} ;
    style-src 'self' https://fonts.googleapis.com ;
    worker-src blob: ;
    ${reportUri}
    upgrade-insecure-requests;`;

  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: cspHeader.replace(/\n/g, ""),
        },
      ],
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: BASE_PATH,
  output: STATIC_EXPORT ? "export" : undefined,
  env: clientEnv,
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.sparql$/,
      type: "asset/resource",
      exclude: /node_modules/,
    }, {
      test: /\.sql$/,
      type: "asset/source",
      exclude: /node_modules/,
    });

    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
    ],
  },
  headers: csp_enable ? generateCspHeaders : undefined,
  reactStrictMode: true,
};

// export default nextConfig;

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  //org: "__TODO_GET_FROM_CONFIG__",
  //project: "__TODO_GET_FROM_CONFIG__",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  debug: false,//process.env.NODE_ENV === "development",

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true, //process.env.NODE_ENV !== "development", // https://github.com/getsentry/sentry-javascript/issues/10951#issuecomment-1982739125

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
