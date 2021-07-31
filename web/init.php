<?php
require_once("./Configuration.php");
require_once("./funcs.php");
header( "Content-Type: application/javascript; charset=utf-8" );

$conf = new Configuration();

?>

Sentry.init({
  dsn: "<?=(string)$conf->get("sentry-js-dsn");?>",
  environment: "<?=(string)$conf->get("sentry-js-env");?>",
  integrations: [new Sentry.Integrations.BrowserTracing()],
  tracesSampleRate: <?=(float)$conf->get("sentry-js-rate");?>,
});
