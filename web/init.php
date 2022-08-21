<?php
require_once("./app/IniEnvConfiguration.php");
require_once("./funcs.php");

use \App\IniEnvConfiguration;

$conf = new IniEnvConfiguration();
prepareJS($conf);

if ($conf->hasAll(['sentry-js-url',"sentry-js-env"])) {
?>
Sentry.onLoad(function() {
  Sentry.init({
    environment: "<?= (string)$conf->get("sentry-js-env"); ?>"
  });
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

var maptiler_key = <?=json_encode((string)$conf->get("maptiler_key"));?>,
    default_center_lat = <?=(float)$conf->get("default-center-lat");?>,
    default_center_lon = <?=(float)$conf->get("default-center-lon");?>,
    default_zoom = <?=(int)$conf->get("default-zoom");?>,
    thresholdZoomLevel = <?=(int)$conf->get("threshold-zoom-level");?>,
    defaultBackgroundStyle = <?=json_encode((string)$conf->get("default-background-style"));?>,
    defaultColorScheme = <?=json_encode((string)$conf->get("default-color-scheme"));?>,
    minZoomLevel = <?=(int)$conf->get("min-zoom-level");?>;
