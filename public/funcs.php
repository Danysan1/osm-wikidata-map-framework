<?php

declare(strict_types=1);
require_once(__DIR__ . "/../vendor/autoload.php");
require_once(__DIR__ . "/../app/Configuration.php");

define("ISO_LANGUAGE_PATTERN", '/^(\w+)(-\w+)?$/');

use \App\Configuration;

/**
 * @param Throwable $t
 * @return void
 */
function handleException(Throwable $t)
{
	error_log(
		$t->getMessage() . PHP_EOL .
			$t->getTraceAsString()
	);
	if (function_exists('\Sentry\captureException')) \Sentry\captureException($t);
	http_response_code(500);
	//die('{"success":false, "error":"An internal error occurred"}');
	die(json_encode(["success" => false, "error" => $t->getMessage()]));
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
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareHTML(Configuration $conf)
{
	preparePage($conf);
	header("Content-Type: text/html; charset=utf-8");

	$reportUri = "";
	if ($conf->has('sentry_js_uri')) {
		$reportUri = "report-uri " . (string)$conf->get("sentry_js_uri") . "; ";
	}

	$mapboxScriptSrcs = 'https://api.mapbox.com';
	$mapboxConnectSrcs = 'https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com';

	$maptilerConnectSrcs = '';
	if ($conf->has("maptiler_key")) {
		$maptilerConnectSrcs = 'https://api.maptiler.com';
	}

	$googleAnalyticsConnectSrcs = '';
	$googleAnalyticsScriptSrcs = '';
	if ($conf->has('google_analytics_id')) {
		$googleAnalyticsConnectSrcs = 'https://*.google-analytics.com https://stats.g.doubleclick.net https://analytics.google.com https://*.analytics.google.com/g/collect https://www.googletagmanager.com https://www.google.com/ads/ga-audiences https://www.google.it/ads/ga-audiences https://www.google.ru/ads/ga-audiences https://www.google.co.in/ads/ga-audiences https://www.google.no/ads/ga-audiences https://www.google.co.jp/ads/ga-audiences https://www.google.dk/ads/ga-audiences https://www.google.de/ads/ga-audiences https://www.google.be/ads/ga-audiences https://www.google.nl/ads/ga-audiences https://www.google.fr/ads/ga-audiences https://www.google.co.hk/ads/ga-audiences https://www.google.ch/ads/ga-audiences';
		$googleAnalyticsScriptSrcs = 'https://www.googletagmanager.com/gtag/js https://www.google-analytics.com';
	}

	$sentryConnectSrcs = '';
	$sentryScriptSrcs = '';
	if ($conf->has('sentry_js_dsn')) {
		$sentryConnectSrcs = 'https://*.ingest.sentry.io';
		$sentryScriptSrcs = 'https://js.sentry-cdn.com https://browser.sentry-cdn.com';
	}

	$matomoConnectSrcs = '';
	$matomoScriptSrcs = '';
	if ($conf->has('matomo_domain')) {
		$matomoConnectSrcs = 'https://' . (string)$conf->get('matomo_domain');
		$matomoScriptSrcs = 'https://cdn.matomo.cloud/';
	}

	header(
		"Content-Security-Policy: " .
			"default-src 'self'; " .
			"worker-src blob: ; " .
			"child-src blob: ; " .
			"img-src 'self' data: blob: https://commons.wikimedia.org https://commons.m.wikimedia.org https://upload.wikimedia.org $googleAnalyticsConnectSrcs ; " .
			"font-src 'self'; " .
			"style-src 'self' https://fonts.googleapis.com; " .
			"script-src 'self' $sentryScriptSrcs $matomoScriptSrcs $mapboxScriptSrcs $googleAnalyticsScriptSrcs ; " .
			"frame-ancestors 'none'; " .
			"object-src 'none'; " .
			"connect-src 'self' $sentryConnectSrcs $matomoConnectSrcs $mapboxConnectSrcs $maptilerConnectSrcs $googleAnalyticsConnectSrcs ; " .
			$reportUri .
			//"require-trusted-types-for 'script'; ".
			"upgrade-insecure-requests;"
	);
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareText(Configuration $conf)
{
	preparePage($conf);
	header("Content-Type: text/plain; charset=utf-8");
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareCSV(Configuration $conf)
{
	preparePage($conf);
	header("Content-Type: text/csv; charset=utf-8");
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareJSON(Configuration $conf)
{
	preparePage($conf);
	header("Content-Type: application/json; charset=utf-8");
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareGeoJSON(Configuration $conf)
{
	preparePage($conf);
	header("Content-Type: application/geo+json; charset=utf-8");
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareJS(Configuration $conf)
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
