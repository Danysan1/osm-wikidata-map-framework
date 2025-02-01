export async function register() {
  if (process.env.owmf_sentry_js_dsn && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.owmf_sentry_js_dsn && process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
