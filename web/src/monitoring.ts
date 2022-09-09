import { getConfig } from "./config";
import { init, captureException, captureMessage, SeverityLevel } from "@sentry/browser";
import { Extras } from '@sentry/types';

/**
 * @see https://docs.sentry.io/platforms/javascript/
 */
function initSentry() {
    const sentry_js_dsn = getConfig("sentry-js-dsn"),
        sentry_js_env = getConfig("sentry-js-env");
    if (sentry_js_dsn && sentry_js_env) {
        console.info("Initializing Sentry", { sentry_js_dsn, sentry_js_env });
        init({
            dsn: sentry_js_dsn,
            environment: sentry_js_env
        });
    }
}

function logErrorMessage(message: string, level: SeverityLevel = "error", extra: object | undefined = undefined) {
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
    console.error(message, extra);
}

/**
 * @see https://support.google.com/analytics/answer/9304153#zippy=%2Cadd-your-tag-using-google-tag-manager%2Cadd-the-google-tag-directly-to-your-web-pages
 */
function initGoogleAnalytics() {
    const google_analytics_id = getConfig("google-analytics-id"),
        gtag: Gtag.Gtag = function () { (window as any).dataLayer.push(arguments); }

    if (google_analytics_id) {
        console.info("Initializing Google Analytics", { google_analytics_id });
        (window as any).dataLayer = (window as any).dataLayer || [];
        gtag('js', new Date());
        gtag('config', google_analytics_id);
    }
}

/**
 * @see https://developer.matomo.org/guides/tracking-javascript-guide
 */
function initMatomo() {
    const matomo_domain = getConfig("matomo-domain"),
        matomo_id = getConfig("matomo-id");

    if (matomo_domain && matomo_id) {
        console.info("Initializing Matomo", { matomo_domain, matomo_id });
        var _paq = (window as any)._paq = (window as any)._paq || [];
        /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
        _paq.push(['trackPageView']);
        _paq.push(['enableLinkTracking']);
        (function () {
            var u = `https://${matomo_domain}/`;
            _paq.push(['setTrackerUrl', u + 'matomo.php']);
            _paq.push(['setSiteId', matomo_id]);
            var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
            g.async = true; g.src = `//cdn.matomo.cloud/${matomo_domain}/matomo.js`; s.parentNode?.insertBefore(g, s);
        })();
    }
}

export { initGoogleAnalytics, initMatomo, initSentry, logErrorMessage };
