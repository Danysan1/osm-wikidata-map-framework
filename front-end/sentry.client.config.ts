// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const replaysOnErrorSampleRate = process.env.owmf_sentry_js_replays_on_error_sample_rate ? parseFloat(process.env.owmf_sentry_js_replays_on_error_sample_rate) : undefined,
  replaysSessionSampleRate = process.env.owmf_sentry_js_replays_session_sample_rate ? parseFloat(process.env.owmf_sentry_js_replays_session_sample_rate) : undefined,
  enableReplay = replaysOnErrorSampleRate && replaysOnErrorSampleRate > 0;

Sentry.init({
  dsn: process.env.owmf_sentry_js_dsn,
  environment: process.env.owmf_sentry_js_env,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.5,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  // debug: process.env.NODE_ENV === 'development',

  replaysOnErrorSampleRate: replaysOnErrorSampleRate,

  replaysSessionSampleRate: replaysSessionSampleRate,

  integrations: enableReplay ? [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ] : undefined,
});
