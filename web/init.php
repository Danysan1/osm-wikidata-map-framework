<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");

use \App\IniFileConfiguration;

$conf = new IniFileConfiguration();
prepareJS($conf);

?>

<?php
if ($conf->has("sentry-js-dsn")) {
?>
Sentry.init({
  dsn: "<?=(string)$conf->get("sentry-js-dsn");?>",
  environment: "<?=(string)$conf->get("sentry-js-env");?>",
});
<?php
}

if ($conf->has("google-analytics-id")) {
  ?>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '<?=(string)$conf->get("google-analytics-id");?>');
<?php
}
?>

var mapbox_gl_token = '<?=(string)$conf->get("mapbox-gl-token");?>',
    default_center_lat = <?=(float)$conf->get("default-center-lat");?>,
    default_center_lon = <?=(float)$conf->get("default-center-lon");?>,
    default_zoom = <?=(int)$conf->get("default-zoom");?>,
    thresholdZoomLevel = <?=(int)$conf->get("threshold-zoom-level");?>,
    defaultBackgroundStyle = '<?=(string)$conf->get("default-background-style");?>',
    defaultColorScheme = '<?=(string)$conf->get("default-color-scheme");?>',
    minZoomLevel = <?=(int)$conf->get("min-zoom-level");?>;
