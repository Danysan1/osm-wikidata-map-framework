import { getConfig } from "./config";
import { init, captureException, captureMessage, SeverityLevel } from "@sentry/browser";
import { Extras } from '@sentry/types';

function initSentry() {
    const sentry_js_dsn = getConfig("sentry_js_dsn"),
        sentry_js_env = getConfig("sentry_js_env");
    if (sentry_js_dsn && sentry_js_env) {
        console.info("Initializing Sentry", { sentry_js_dsn, sentry_js_env });
        init({
            dsn: sentry_js_dsn,
            environment: sentry_js_env
        });
    }
}

function logErrorMessage(message: string, level: string = "error", extra: object | undefined = undefined) {
    if (extra instanceof Error) {
        captureException(extra, {
            level: (level as SeverityLevel),
            extra: ({ message } as Extras)
        });
    } else {
        captureMessage(message, {
            level: (level as SeverityLevel),
            extra: (extra as Extras)
        });
    }
    console.error(message, extra);
}

export { initSentry, logErrorMessage };