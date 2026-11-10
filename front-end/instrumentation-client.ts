// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const replaysOnErrorSampleRate = process.env.NEXT_PUBLIC_OWMF_sentry_js_replays_on_error_sample_rate ? parseFloat(process.env.NEXT_PUBLIC_OWMF_sentry_js_replays_on_error_sample_rate) : undefined,
  replaysSessionSampleRate = process.env.NEXT_PUBLIC_OWMF_sentry_js_replays_session_sample_rate ? parseFloat(process.env.NEXT_PUBLIC_OWMF_sentry_js_replays_session_sample_rate) : undefined,
  enableReplay = replaysOnErrorSampleRate && replaysOnErrorSampleRate > 0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_OWMF_sentry_js_dsn,
  environment: process.env.NEXT_PUBLIC_OWMF_sentry_js_env,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: replaysSessionSampleRate,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: replaysOnErrorSampleRate,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.5,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false, // Too verbose even for development

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  // Add optional integrations for additional features
  integrations: enableReplay ? [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ] : undefined,
});
