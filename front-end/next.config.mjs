import nextBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from "@sentry/nextjs";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

if (process.env.NODE_ENV === "development")
  console.log("Launching development server");
else if (process.env.NODE_ENV === "test")
  console.log("Running tests");
else if (process.env.owmf_static_export === "true")
  console.log("Static export enabled, generating static files to be served with any web server");
else
  console.log("Static export disabled, building dynamic server-side app to be run with `next start`");

process.env.NEXT_PUBLIC_OWMF_version = JSON.parse(readFileSync('package.json', 'utf8')).version;

if(existsSync("i18n.json")) {
  console.log("Reading custom translations from i18n.json");
  process.env.NEXT_PUBLIC_OWMF_i18n_override = readFileSync("i18n.json", "utf8");
}

if (!process.env.NEXT_PUBLIC_OWMF_source_presets || process.env.NEXT_PUBLIC_OWMF_source_presets === "all") {
  const presetDir = join(process.cwd(), "public", "presets"),
    presetFiles = existsSync(presetDir) ? readdirSync(presetDir) : [],
    allPresets = presetFiles
      .filter(fileName => fileName.endsWith(".json"))
      .map(fileName => fileName.replace(/\.json$/, ""));
  console.info("Using all available presets");
  process.env.NEXT_PUBLIC_OWMF_source_presets = JSON.stringify(allPresets);
}

const csp_enable = process.env.owmf_csp_enable === "true";
function generateCspHeaders() {
  const reportUri = process.env.owmf_sentry_js_uri ? `report-uri ${process.env.owmf_sentry_js_uri}` : "",
    mapboxScript = process.env.NEXT_PUBLIC_OWMF_mapbox_token ? " https://api.mapbox.com" : "",
    mapboxConnect = 'https://unpkg.com/@mapbox/' + process.env.NEXT_PUBLIC_OWMF_mapbox_token ? ' https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com' : "",
    maptilerConnect = process.env.NEXT_PUBLIC_OWMF_maptiler_key ? "https://api.maptiler.com/ https://maputnik.github.io/osm-liberty/ https://orangemug.github.io/font-glyphs/ https://klokantech.github.io/naturalearthtiles/" : "",
    maptilerImg = process.env.NEXT_PUBLIC_OWMF_maptiler_key ? "https://cdn.maptiler.com/maptiler-geocoding-control/" : "",
    stadiaConnect = process.env.NEXT_PUBLIC_OWMF_enable_stadia_maps === "true" ? 'https://tiles.stadiamaps.com/ https://api.stadiamaps.com/geocoding/' : "",
    jawgConnect = process.env.NEXT_PUBLIC_OWMF_jawg_token ? 'https://api.jawg.io/ https://tile.jawg.io/' : "",
    tracestrackConnect = process.env.NEXT_PUBLIC_OWMF_tracestrack_key ? 'https://api.jawg.io/ https://tile.jawg.io/' : "",
    googleAnalyticsImg = process.env.NEXT_PUBLIC_OWMF_google_analytics_id ? 'https://*.google-analytics.com https://stats.g.doubleclick.net https://analytics.google.com https://*.analytics.google.com/g/collect https://www.googletagmanager.com https://www.google.com/ads/ga-audiences' : "",
    googleAnalyticsScript = process.env.NEXT_PUBLIC_OWMF_google_analytics_id ? 'https://www.googletagmanager.com/gtag/js https://www.google-analytics.com' : "",
    sentryConnect = process.env.owmf_sentry_js_dsn ? 'https://*.ingest.sentry.io' : "",
    sentryScript = process.env.owmf_sentry_js_dsn ? 'https://js.sentry-cdn.com https://browser.sentry-cdn.com' : "",
    wikimediaImg = "https://commons.wikimedia.org https://commons.m.wikimedia.org https://upload.wikimedia.org",
    wikimediaConnect = `${process.env.NEXT_PUBLIC_OWMF_wikibase_rest_endpoint_url} ${process.env.NEXT_PUBLIC_OWMF_wikibase_sparql_endpoint_url} https://*.wikipedia.org/api/rest_v1/page/summary/ https://commons.wikimedia.org/w/api.php`,
    ohmConnect = process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map === "true" ? "https://www.openhistoricalmap.org/map-styles/" : "",
    osmConnect = process.env.NEXT_PUBLIC_OWMF_overpass_api_url ?? "",
    payPalForm = process.env.NEXT_PUBLIC_OWMF_paypal_id ? 'https://www.paypal.com/donate' : "",
    payPalImg = process.env.NEXT_PUBLIC_OWMF_paypal_id ? 'https://www.paypal.com https://www.paypalobjects.com' : "",
    qleverConnect = process.env.NEXT_PUBLIC_OWMF_qlever_instance_url ?? "",
    pmtilesConnect = process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url?.startsWith("http://localhost") ? process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url : "",
    osmAmericanaConnect = 'https://zelonewolf.github.io/openstreetmap-americana/ https://osm-americana.github.io/fontstack66/ https://tile.ourmap.us/data/ https://*.cloudfront.net/planet/',
    cspHeader = `
    child-src blob: ;
    connect-src 'self' ${wikimediaConnect} ${osmConnect} ${ohmConnect} ${sentryConnect} ${mapboxConnect} ${maptilerConnect} ${stadiaConnect} ${jawgConnect} ${tracestrackConnect} ${googleAnalyticsImg} ${qleverConnect} ${pmtilesConnect} ${osmAmericanaConnect} ;
    default-src 'self' ;
    font-src 'self' ;
    form-action 'self' ${payPalForm} ;
    frame-ancestors 'none' ;
    img-src 'self' data: blob: ${wikimediaImg} ${payPalImg} ${googleAnalyticsImg} ${maptilerImg} ;
    object-src 'none';
    script-src 'self' ${sentryScript} ${mapboxScript} ${googleAnalyticsScript} ;
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
let nextConfig = {
  basePath: process.env.NEXT_PUBLIC_OWMF_base_path,
  output: process.env.owmf_static_export === "true" ? "export" : undefined,
  trailingSlash: process.env.owmf_static_export === "true",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
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

if (process.env.ANALYZE === 'true' && process.env.NODE_ENV === "production") {
  console.log("Configuring for bundle analysis");
  nextConfig = nextBundleAnalyzer()(nextConfig);
}

if (process.env.owmf_sentry_js_dsn && process.env.NODE_ENV !== "test") {
  console.log("Configuring for Sentry");
  nextConfig = withSentryConfig(nextConfig, {
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
    sourcemaps: {
      deleteSourcemapsAfterUpload: true
    },

  });
}

export default nextConfig;
