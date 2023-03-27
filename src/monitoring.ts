import { debugLog, getConfig } from "./config";
import { SeverityLevel } from "@sentry/browser";
import { Extras, Integration } from '@sentry/types';

/**
 * @see https://docs.sentry.io/platforms/javascript/
 * @see https://docs.sentry.io/platforms/javascript/session-replay/
 */
function initSentry() {
    const dsn = getConfig("sentry_js_dsn"),
        environment = getConfig("sentry_js_env");
    if (dsn && environment) {
        import("./Sentry").then(({ init, Replay }) => {
            const rawReplaysSessionSampleRate = getConfig("sentry_js_replays_session_sample_rate"),
                rawReplaysOnErrorSampleRate = getConfig("sentry_js_replays_on_error_sample_rate"),
                replaysSessionSampleRate = rawReplaysSessionSampleRate ? parseFloat(rawReplaysSessionSampleRate) : 0,
                replaysOnErrorSampleRate = rawReplaysOnErrorSampleRate ? parseFloat(rawReplaysOnErrorSampleRate) : 0,
                enableReplay = replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0,
                integrations: Integration[] = [];

            if (enableReplay)
                integrations.push(new Replay({ maskAllText: true, blockAllMedia: true }));

            debugLog("Initializing Sentry", {
                dsn, environment, rawReplaysOnErrorSampleRate, replaysOnErrorSampleRate, enableReplay
            });
            init({ dsn, environment, replaysSessionSampleRate, replaysOnErrorSampleRate, integrations });
        }).catch((err) => console.error("Failed loading Sentry due to an error", err));
    }
}

function logErrorMessage(message: string, level: SeverityLevel = "error", extra: object | undefined = undefined) {
    console.error(message, extra);
    import("./Sentry").then(({ captureException, captureMessage }) => {
        if (extra instanceof Error) {
            captureException(extra, {
                level: level,
                extra: ({ message } as Extras)
            });
        } else {
            captureMessage(message, {
                level: level,
                extra: (extra as Extras)
            });
        }
    }).catch((err) => console.error("Failed logging Sentry due to an error", err));
}

/**
 * @see https://support.google.com/analytics/answer/9304153#zippy=%2Cadd-your-tag-using-google-tag-manager%2Cadd-the-google-tag-directly-to-your-web-pages
 */
function initGoogleAnalytics() {
    const google_analytics_id = getConfig("google_analytics_id"),
        // eslint-disable-next-line prefer-rest-params
        gtag: Gtag.Gtag = function () { (window as any).dataLayer.push(arguments); }

    if (google_analytics_id) {
        debugLog("Initializing Google Analytics", { google_analytics_id });
        (window as any).dataLayer = (window as any).dataLayer || [];
        gtag('js', new Date());
        gtag('config', google_analytics_id);
    }
}

/**
 * @see https://developer.matomo.org/guides/tracking-javascript-guide
 */
function initMatomo() {
    const matomo_domain = getConfig("matomo_domain"),
        matomo_id = getConfig("matomo_id");

    if (matomo_domain && matomo_id) {
        debugLog("Initializing Matomo", { matomo_domain, matomo_id });
        // eslint-disable-next-line no-var
        var _paq = (window as any)._paq = (window as any)._paq || [];
        /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
        _paq.push(['trackPageView']);
        _paq.push(['enableLinkTracking']);
        (function () {
            // eslint-disable-next-line no-var
            var u = `https://${matomo_domain}/`;
            _paq.push(['setTrackerUrl', u + 'matomo.php']);
            _paq.push(['setSiteId', matomo_id]);
            // eslint-disable-next-line no-var
            var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
            g.async = true; g.src = `//cdn.matomo.cloud/${matomo_domain}/matomo.js`; s.parentNode?.insertBefore(g, s);
        })();
    }
}

export { initGoogleAnalytics, initMatomo, initSentry, logErrorMessage };
