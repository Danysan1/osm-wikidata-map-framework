<?php
require_once("./Configuration.php");

function preparaHTML(Configuration $conf) {
	header( "Content-Type: text/html; charset=utf-8" );
	header(
		"Content-Security-Policy: ".
			"default-src 'self'; ".
			"img-src 'self' https://kendo.cdn.telerik.com; ".
			"font-src 'self' 'unsafe-eval' https://fonts.gstatic.com https://use.fontawesome.com https://kendo.cdn.telerik.com; ".
			"style-src 'self' 'unsafe-eval' https://fonts.googleapis.com https://use.fontawesome.com https://kendo.cdn.telerik.com; ".
			"script-src 'self' 'unsafe-eval' https://browser.sentry-cdn.com https://kendo.cdn.telerik.com https://cdnjs.cloudflare.com; ".
			"frame-ancestors 'none'; ".
			"object-src 'none'; ".
			"connect-src 'self' ".$conf->get("sentry-js-domain")."; ".
			"report-uri ".$conf->get("sentry-js-uri")."; ".
			"upgrade-insecure-requests;"
	);
}

/**
 * @param string $paramName
 * @param int $filter
 * @see https://www.php.net/manual/en/filter.filters.php
 * @see https://www.php.net/manual/en/filter.filters.validate.php
 * @see https://www.php.net/manual/en/filter.filters.sanitize.php
 * @see https://www.php.net/manual/en/filter.constants.php
 * @return mixed
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
 */
function getFilteredParamOrDefault($paramName, $filter=FILTER_DEFAULT, $defaultValue=NULL) {
	$paramValue = filter_input(INPUT_GET, $paramName, $filter);
	if($paramValue===FALSE || $paramValue===NULL) {
		$paramValue = $defaultValue;
	}
	return $paramValue;
}

