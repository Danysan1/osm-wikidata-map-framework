let sentry;

function initSentry() {
    const sentry_js_dsn = document.head.querySelector('meta[name="sentry_js_dsn"]')?.content,
        sentry_js_env = document.head.querySelector('meta[name="sentry_js_env"]')?.content;
    if (sentry_js_dsn && sentry_js_env) {
        console.info("Initializing Sentry", { sentry_js_dsn, sentry_js_env });
        import("@sentry/browser").then(Sentry => {
            sentry = Sentry;
            Sentry.init({
                dsn: sentry_js_dsn,
                environment: sentry_js_env
            });
        });
    }
}

/**
 * 
 * @param {string} message 
 * @param {string} level Log level (default "error")
 * @param {object} extra 
 */
function logErrorMessage(message, level = "error", extra = undefined) {
    console.error(message, extra);
    if (typeof sentry == 'object') {
        if (extra instanceof Error)
            sentry.captureException(extra, { level, extra: message });
        else
            sentry.captureMessage(message, { level, extra });
    }
}

export { initSentry, logErrorMessage };