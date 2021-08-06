<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");
header( "Content-Type: application/javascript; charset=utf-8" );

$conf = new IniFileConfiguration();

?>

Sentry.init({
  dsn: "<?=(string)$conf->get("sentry-js-dsn");?>",
  environment: "<?=(string)$conf->get("sentry-js-env");?>",
  integrations: [new Sentry.Integrations.BrowserTracing()],
  tracesSampleRate: <?=(float)$conf->get("sentry-js-rate");?>,
});

var mapbox_gl_token = '<?=(string)$conf->get("mapbox-gl-token");?>',
    default_center_lat = <?=(float)$conf->get("default-center-lat");?>,
    default_center_lon = <?=(float)$conf->get("default-center-lon");?>,
    default_zoom = <?=(float)$conf->get("default-zoom");?>;
