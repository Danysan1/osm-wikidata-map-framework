<?php
require_once("./Configuration.php");
require_once("./funcs.php");
header( "Content-Type: application/javascript; charset=utf-8" );

$conf = new Configuration();

$minLat = (float)getFilteredParamOrDefault( "minLat", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-min-lat") );
$minLon = (float)getFilteredParamOrDefault( "minLon", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-min-lon") );
$maxLat = (float)getFilteredParamOrDefault( "maxLat", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-max-lat") );
$maxLon = (float)getFilteredParamOrDefault( "maxLon", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-max-lon") );
?>

Sentry.init({
  dsn: "<?=$conf->get("sentry-js-dsn");?>",
  environment: "<?=$conf->get("sentry-js-env");?>",
  integrations: [new Sentry.Integrations.BrowserTracing()],
  tracesSampleRate: <?=$conf->get("sentry-js-rate");?>,
});

var minLat = <?=$minLat;?>,
    minLon = <?=$minLon;?>,
    maxLat = <?=$maxLat;?>,
    maxLon = <?=$maxLon;?>;