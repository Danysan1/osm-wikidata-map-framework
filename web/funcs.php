<?php
require_once(__DIR__."/../vendor/autoload.php");
require_once(__DIR__."/Configuration.php");

/**
 * @param Configuration $conf
 * @return void
 */
function preparePage(Configuration $conf) {
	ini_set("error_log", (string)$conf->get("log-file-path"));
	\Sentry\init([
		'dsn' => (string)$conf->get('sentry-php-dsn'),
		'traces_sample_rate' => (float)$conf->get('sentry-php-rate'),
	]);
	set_exception_handler(function(Throwable $t) {
		error_log(
			$t->getMessage().PHP_EOL.
			$t->getTraceAsString()
		);
		\Sentry\captureException($t);
		http_response_code(500);
		//die('{"success":false, "error":"An internal error occurred"}');
		die(json_encode(["success" => false, "error"=>$t->getMessage()]));
	});
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
	header(
		"Content-Security-Policy: ".
			"default-src 'self'; ".
			"worker-src blob: ; ".
			"child-src blob: ; ".
			"img-src 'self' data: blob: https://kendo.cdn.telerik.com https://commons.wikimedia.org https://upload.wikimedia.org; ".
			"font-src 'self' 'unsafe-eval' https://fonts.gstatic.com https://use.fontawesome.com https://kendo.cdn.telerik.com; ".
			"style-src 'self' 'unsafe-eval' 'unsafe-inline' https://fonts.googleapis.com https://use.fontawesome.com https://kendo.cdn.telerik.com https://api.mapbox.com; ".
			"script-src 'self' 'unsafe-eval' https://browser.sentry-cdn.com https://kendo.cdn.telerik.com https://cdnjs.cloudflare.com https://api.mapbox.com; ".
			"frame-ancestors 'none'; ".
			"object-src 'none'; ".
			"connect-src 'self' ".(string)$conf->get("sentry-js-domain")." https://api.mapbox.com https://events.mapbox.com; ".
			"report-uri ".(string)$conf->get("sentry-js-uri")."; ".
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

