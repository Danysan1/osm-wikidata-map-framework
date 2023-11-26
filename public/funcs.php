<?php

declare(strict_types=1);
require_once(__DIR__ . "/../vendor/autoload.php");

use \App\Config\Configuration;

function handleException(Throwable $t): never
{
	error_log($t->getMessage() . PHP_EOL . $t->getTraceAsString());
	if (function_exists('\Sentry\captureException')) \Sentry\captureException($t);
	http_response_code(500);
	die(json_encode([
		"success" => false,
		"error" => $t instanceof PDOException ? "An internal error occurred." : $t->getMessage()
	]));
}

/**
 * @param Configuration $conf
 * @return void
 */
function preparePage(Configuration $conf)
{
	if ($conf->has('log_file_path'))
		ini_set("error_log", (string)$conf->get("log_file_path"));

	if ($conf->has('sentry_php_dsn')) {
		\Sentry\init([
			'dsn' => (string)$conf->get('sentry_php_dsn'),
			'environment' => (string)$conf->get('sentry_php_env'),
		]);
	}

	set_exception_handler('handleException');
	ini_set('session.cookie_httponly', 'true');
	ini_set('session.cookie_secure', 'true');
	ini_set('session.cookie_path', '/; samesite=Strict');
	ini_set('session.use_strict_mode', 'true');

	if (!empty($_SERVER['HTTP_ORIGIN']) && $conf->has('allowed_origins')) {
		$origin = $_SERVER['HTTP_ORIGIN'];
		$allowedOrigins = $conf->getArray('allowed_origins');
		if (in_array($origin, $allowedOrigins))
			header("Access-Control-Allow-Origin: $origin");
	}
}

/**
 * @param Configuration $conf
 * @return void
 * 
 * @see https://maplibre.org/maplibre-gl-js/docs/#csp-directives
 * @see https://docs.mapbox.com/mapbox-gl-js/guides/browsers-and-testing/
 */
function prepareHTML(Configuration $conf)
{
	if (!$conf->has("mapbox_token") && !$conf->has("maplibre_token") && !$conf->getBool("enable_stadia_maps") && !$conf->has("jawg_token")) {
		http_response_code(500);
		die('<html><body>No background map has been enabled in the configuration. See the configuration file (.env) for more details.</body></html>');
	}

	preparePage($conf);
	header("Content-Type: text/html; charset=utf-8");

	$reportUri = "";
	if ($conf->has('sentry_js_uri')) {
		$reportUri = "report-uri " . (string)$conf->get("sentry_js_uri") . "; ";
	}

	$mapboxScript = '';
	$mapboxConnect = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/';
	if ($conf->has("mapbox_token")) {
		$mapboxScript = 'https://api.mapbox.com';
		$mapboxConnect = 'https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com';
	}

	$maptilerConnect = '';
	$maptilerImg = '';
	if ($conf->has("maptiler_key")) {
		$maptilerConnect = 'https://api.maptiler.com https://maputnik.github.io/osm-liberty/ https://klokantech.github.io/naturalearthtiles/';
		$maptilerImg = 'https://cdn.maptiler.com/maptiler-geocoding-control/';
	}

	$stadiaConnect = '';
	if ($conf->getBool("enable_stadia_maps")) {
		$stadiaConnect = 'https://tiles.stadiamaps.com/ https://api.stadiamaps.com/geocoding/';
	}

	$jawgConnect = '';
	if ($conf->has("jawg_token")) {
		$jawgConnect = 'https://api.jawg.io/ https://tile.jawg.io/';
	}

	$googleAnalyticsImg = '';
	$googleAnalyticsScript = '';
	if ($conf->has('google_analytics_id')) {
		$googleAnalyticsImg = 'https://*.google-analytics.com https://stats.g.doubleclick.net https://analytics.google.com https://*.analytics.google.com/g/collect https://www.googletagmanager.com https://www.google.com/ads/ga-audiences https://www.google.it/ads/ga-audiences https://www.google.ru/ads/ga-audiences https://www.google.co.in/ads/ga-audiences https://www.google.no/ads/ga-audiences https://www.google.co.jp/ads/ga-audiences https://www.google.dk/ads/ga-audiences https://www.google.de/ads/ga-audiences https://www.google.be/ads/ga-audiences https://www.google.nl/ads/ga-audiences https://www.google.fr/ads/ga-audiences https://www.google.co.hk/ads/ga-audiences https://www.google.ch/ads/ga-audiences';
		$googleAnalyticsScript = 'https://www.googletagmanager.com/gtag/js https://www.google-analytics.com';
	}

	$sentryConnect = '';
	$sentryScript = '';
	if ($conf->has('sentry_js_dsn')) {
		$sentryConnect = 'https://*.ingest.sentry.io';
		$sentryScript = 'https://js.sentry-cdn.com https://browser.sentry-cdn.com';
	}

	$matomoConnect = '';
	$matomoScript = '';
	if ($conf->has('matomo_domain')) {
		$matomoConnect = 'https://' . (string)$conf->get('matomo_domain');
		$matomoScript = 'https://cdn.matomo.cloud/';
	}

	$wikimediaImg = "https://commons.wikimedia.org https://commons.m.wikimedia.org https://upload.wikimedia.org";
	$wikimediaConnect = "https://query.wikidata.org/sparql https://*.wikipedia.org/api/rest_v1/page/summary/ https://commons.wikimedia.org/w/api.php https://www.wikidata.org/w/rest.php/wikibase/v0/entities/items/";

	$overpassConnect = implode(" ", $conf->getArray('overpass_endpoints'));

	$liberapayImg = '';
	if ($conf->has("liberapay_id")) {
		$liberapayImg = "https://liberapay.com";
	}

	$payPalForm = '';
	$payPalImg = '';
	if ($conf->has("paypal_id")) {
		$payPalForm = "https://www.paypal.com/donate";
		$payPalImg = "https://www.paypal.com https://www.paypalobjects.com";
	}

	$pmtilesConnect = '';
	if ($conf->has('pmtiles_base_url') && !str_starts_with((string)$conf->get('pmtiles_base_url'), 'http://localhost')) {
		$pmtilesConnect = (string)$conf->get('pmtiles_base_url');
	}

	header(
		"Content-Security-Policy: " .
			"child-src blob: ; " .
			"connect-src 'self' $wikimediaConnect $overpassConnect $sentryConnect $matomoConnect $mapboxConnect $maptilerConnect $stadiaConnect $jawgConnect $googleAnalyticsImg $pmtilesConnect; " .
			"default-src 'self' ; " .
			"font-src 'self' ; " .
			"form-action 'self' $payPalForm ; " .
			"frame-ancestors 'none' ; " .
			"img-src 'self' data: blob: $wikimediaImg $liberapayImg $payPalImg $googleAnalyticsImg $maptilerImg ; " .
			"object-src 'none'; " .
			"script-src 'self' $sentryScript $matomoScript $mapboxScript $googleAnalyticsScript ; " .
			"style-src 'self' https://fonts.googleapis.com ; " .
			"worker-src blob: ; " .
			$reportUri .
			//"require-trusted-types-for 'script'; ".
			"upgrade-insecure-requests;"
	);
}

function prepareText(Configuration $conf): void
{
	preparePage($conf);
	header("Content-Type: text/plain; charset=utf-8");
}

function prepareCSV(Configuration $conf): void
{
	preparePage($conf);
	header("Content-Type: text/csv; charset=utf-8");
}

function prepareJSON(Configuration $conf): void
{
	preparePage($conf);
	header("Content-Type: application/json; charset=utf-8");
}

function prepareXML(Configuration $conf): void
{
	preparePage($conf);
	header("Content-Type: application/xml; charset=utf-8");
}

function prepareGeoJSON(Configuration $conf): void
{
	preparePage($conf);
	header("Content-Type: application/geo+json; charset=utf-8");
}

function prepareJS(Configuration $conf): void
{
	preparePage($conf);
	header("Content-Type: application/javascript; charset=utf-8");
}

/**
 * @param string $paramName
 * @param int $filter
 * @see https://www.php.net/manual/en/filter.filters.php
 * @see https://www.php.net/manual/en/filter.filters.validate.php
 * @see https://www.php.net/manual/en/filter.filters.sanitize.php
 * @see https://www.php.net/manual/en/filter.constants.php
 * @return mixed
 * @psalm-suppress MixedAssignment
 */
function getFilteredParamOrError($paramName, $filter = FILTER_DEFAULT)
{
	$paramValue = filter_input(INPUT_GET, $paramName, $filter);
	if ($paramValue === FALSE || $paramValue === NULL) {
		http_response_code(400);
		die(json_encode(["error" => "Missing or bad parameter: $paramName"]));
	}
	return $paramValue;
}

/**
 * @param string $paramName
 * @param int $filter
 * @param mixed $defaultValue
 * @see https://www.php.net/manual/en/filter.filters.php
 * @see https://www.php.net/manual/en/filter.filters.validate.php
 * @see https://www.php.net/manual/en/filter.filters.sanitize.php
 * @see https://www.php.net/manual/en/filter.constants.php
 * @return mixed
 * @psalm-suppress MixedAssignment
 */
function getFilteredParamOrDefault($paramName, $filter = FILTER_DEFAULT, $defaultValue = NULL)
{
	$paramValue = filter_input(INPUT_GET, $paramName, $filter);
	if ($paramValue === FALSE || $paramValue === NULL) {
		$paramValue = $defaultValue;
	}
	return $paramValue;
}

define("ISO_LANGUAGE_PATTERN", '/^(\w+)[-\w]*$/');
function getSafeLanguage(string $defaultValue): string
{
	/**
	 * Raw locale / language
	 * 
	 * @example "en-GB-oxendict"
	 */
	$language = (string)(
		filter_input(INPUT_GET, "lang", FILTER_SANITIZE_SPECIAL_CHARS) ??
		filter_input(INPUT_GET, "language", FILTER_SANITIZE_SPECIAL_CHARS) ??
		$defaultValue
	);

	/**
	 * Array of language parts
	 * 
	 * @example ["en-GB-oxendict","en","GB","oxendict"]
	 */
	$langMatches = [];
	if (!preg_match(ISO_LANGUAGE_PATTERN, $language, $langMatches) || empty($langMatches[1])) {
		http_response_code(400);
		die('{"error":"Invalid language code."};');
	}

	/**
	 * Safe language
	 * 
	 * @example "en"
	 */
	return $langMatches[1];
}

function getCurrentURL(): string
{
	if (empty($_SERVER["HTTP_HOST"]) || empty($_SERVER["REQUEST_URI"]))
		throw new Exception("Empty host or URI");

	$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
	return "$protocol://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
}
