import { withSentryConfig } from '@sentry/nextjs';

const CONFIG_KEY_WHITELIST_TO_PASS_TO_CLIENT = [
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
  "owmf_default_backend",
  "owmf_google_analytics_id",
  "owmf_matomo_domain",
  "owmf_matomo_id",
  "owmf_sentry_js_dsn",
  "owmf_sentry_js_env",
  "owmf_overpass_endpoints",
  "owmf_wikidata_endpoint",
  "owmf_mapcomplete_theme",
  "owmf_i18n_override",
  "owmf_max_map_elements",
  "owmf_cache_timeout_hours",
  "owmf_elements_bbox_max_area",
  "owmf_details_bbox_max_area",
  "owmf_max_relation_members",
  "owmf_fetch_parts_of_linked_entities",
  "owmf_wikispore_enable",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  //output: "export",
  env: CONFIG_KEY_WHITELIST_TO_PASS_TO_CLIENT.reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {}),
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.s(par)?ql$/,
      type: 'asset/source',
      exclude: /node_modules/,
    });

    return config
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  //org: "__TODO_GET_FROM_CONFIG__",
  //project: "__TODO_GET_FROM_CONFIG__",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

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
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});