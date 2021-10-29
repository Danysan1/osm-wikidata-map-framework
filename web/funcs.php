<?php
require_once(__DIR__."/../vendor/autoload.php");
require_once(__DIR__."/app/Configuration.php");

use \App\Configuration;

/**
 * @param Throwable $t
 * @return void
 */
function handleException(Throwable $t) {
	error_log(
		$t->getMessage().PHP_EOL.
		$t->getTraceAsString()
	);
	if (function_exists('\Sentry\captureException')) \Sentry\captureException($t);
	http_response_code(500);
	//die('{"success":false, "error":"An internal error occurred"}');
	die(json_encode(["success" => false, "error"=>$t->getMessage()]));
}

/**
 * @param Configuration $conf
 * @return void
 */
function preparePage(Configuration $conf) {
	ini_set("error_log", (string)$conf->get("log-file-path"));
	if ($conf->has('sentry-php-dsn')) {
		\Sentry\init([
			'dsn' => (string)$conf->get('sentry-php-dsn'),
			'environment' => (string)$conf->get('sentry-php-env'),
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
function prepareHTML(Configuration $conf) {
	preparePage($conf);
	header( "Content-Type: text/html; charset=utf-8" );
	$sentryJsDomain = $conf->has('sentry-js-domain') ? (string)$conf->get('sentry-js-domain') : "";
	$reportUri = $conf->has('sentry-js-uri') ? "report-uri ".(string)$conf->get("sentry-js-uri")."; " : "";
	header(
		"Content-Security-Policy: ".
			"default-src 'self'; ".
			"worker-src blob: ; ".
			"child-src blob: ; ".
			"img-src 'self' data: blob: https://commons.wikimedia.org https://commons.m.wikimedia.org https://upload.wikimedia.org https://www.google-analytics.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://www.google.com https://www.google.it; ".
			"font-src 'self' https://fonts.gstatic.com; ".
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ".
			"script-src 'self' https://www.googletagmanager.com/gtag/js https://www.google-analytics.com; ".
			"frame-ancestors 'none'; ".
			"object-src 'none'; ".
			"connect-src 'self' $sentryJsDomain https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com https://www.google-analytics.com https://stats.g.doubleclick.net; ".
			$reportUri.
			//"require-trusted-types-for 'script'; ".
			"upgrade-insecure-requests;"
	);
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareJSON(Configuration $conf) {
	preparePage($conf);
	header( "Content-Type: application/json; charset=utf-8" );
}

/**
 * @param Configuration $conf
 * @return void
 */
function prepareJS(Configuration $conf) {
	preparePage($conf);
	header( "Content-Type: application/javascript; charset=utf-8" );
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
function getFilteredParamOrError($paramName, $filter = FILTER_DEFAULT) {
	$paramValue = filter_input(INPUT_GET, $paramName, $filter);
	if($paramValue===FALSE || $paramValue===NULL) {
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
function getFilteredParamOrDefault($paramName, $filter=FILTER_DEFAULT, $defaultValue=NULL) {
	$paramValue = filter_input(INPUT_GET, $paramName, $filter);
	if($paramValue===FALSE || $paramValue===NULL) {
		$paramValue = $defaultValue;
	}
	return $paramValue;
}

