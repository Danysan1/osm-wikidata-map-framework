<?php
require_once("./app/IniEnvConfiguration.php");
require_once("./funcs.php");

use \App\IniEnvConfiguration;

$conf = new IniEnvConfiguration();
prepareJS($conf);

?>

<?php
if ($conf->has("sentry-js-dsn")) {
?>
Sentry.init({
  dsn: <?=json_encode((string)$conf->get("sentry-js-dsn"));?>,
  environment: <?=json_encode((string)$conf->get("sentry-js-env"));?>,
});
<?php
}

if ($conf->has("google-analytics-id")) {
  ?>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', <?=json_encode((string)$conf->get("google-analytics-id"));?>);
<?php
}
?>

var mapbox_gl_token = <?=json_encode((string)$conf->get("mapbox-gl-token"));?>,
    default_center_lat = <?=(float)$conf->get("default-center-lat");?>,
    default_center_lon = <?=(float)$conf->get("default-center-lon");?>,
    default_zoom = <?=(int)$conf->get("default-zoom");?>,
    thresholdZoomLevel = <?=(int)$conf->get("threshold-zoom-level");?>,
    defaultBackgroundStyle = <?=json_encode((string)$conf->get("default-background-style"));?>,
    defaultColorScheme = <?=json_encode((string)$conf->get("default-color-scheme"));?>,
    enable_map_static_preview = <?=json_encode($conf->getBool("enable-map-static-preview"));?>,
    minZoomLevel = <?=(int)$conf->get("min-zoom-level");?>;
