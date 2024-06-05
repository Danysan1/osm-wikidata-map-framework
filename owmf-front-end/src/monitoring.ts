/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SeverityLevel, captureException, captureMessage, init } from "@sentry/browser";
import type { Extras } from '@sentry/types';

/**
 * @see https://docs.sentry.io/platforms/javascript/
 * @see https://docs.sentry.io/platforms/javascript/session-replay/
 */
function initSentry() {
    const dsn = process.env.owmf_sentry_js_dsn,
        environment = process.env.owmf_sentry_js_env;
    if (dsn && environment) {
        if (process.env.NODE_ENV === 'development') console.debug("Initializing Sentry", { dsn, environment });
        init({ dsn, environment });
    }
}

function logErrorMessage(message: string, level: SeverityLevel = "error", extra: Error | Extras | undefined = undefined) {
    if (level === "warning")
        console.warn(message, extra);
    else
        console.error(message, extra);

    if (extra instanceof Error) {
        captureException(extra, {
            level: level,
            extra: { message }
        });
    } else {
        captureMessage(message, {
            level: level,
            extra: extra
        });
    }
}

/**
 * @see https://support.google.com/analytics/answer/9304153#zippy=%2Cadd-your-tag-using-google-tag-manager%2Cadd-the-google-tag-directly-to-your-web-pages
 */
function initGoogleAnalytics() {
    const google_analytics_id = process.env.owmf_google_analytics_id,
        // eslint-disable-next-line prefer-rest-params
        gtag: Gtag.Gtag = function () { (window as any).dataLayer.push(arguments); }

    if (google_analytics_id) {
        if (process.env.NODE_ENV === 'development') console.debug("Initializing Google Analytics", { google_analytics_id });
        (window as any).dataLayer = (window as any).dataLayer || [];
        gtag('js', new Date());
        gtag('config', google_analytics_id);
    }
}

/**
 * @see https://developer.matomo.org/guides/tracking-javascript-guide
 */
function initMatomo() {
    const matomo_domain = process.env.owmf_matomo_domain,
        matomo_id = process.env.owmf_matomo_id;

    if (matomo_domain && matomo_id) {
        if (process.env.NODE_ENV === 'development') console.debug("Initializing Matomo", { matomo_domain, matomo_id });
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
