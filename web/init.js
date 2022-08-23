const google_analytics_id = document.head.querySelector('meta[name="google_analytics_id"]')?.content,
    sentry_js_url = document.head.querySelector('meta[name="sentry_js_url"]')?.content,
    sentry_js_env = document.head.querySelector('meta[name="sentry_js_env"]')?.content;

console.info("init start", {
    google_analytics_id,
    sentry_js_url,
    sentry_js_env,
});

if (google_analytics_id) {
    console.info("Initializing Google Analytics", {google_analytics_id});
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', google_analytics_id);
}

if (typeof Sentry !== "undefined" && sentry_js_env) {
    console.info("Initializing Sentry", {sentry_js_env});
    Sentry.onLoad(function() {
        Sentry.init({
            environment: sentry_js_env
        });
    });
}