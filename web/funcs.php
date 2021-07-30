<?php

class Configuration {
	private $config;

	/**
	 * @param string $iniFilePath
	 */
	public function __construct($iniFilePath = "/etc/open-etymology-map.ini") {
		$this->config = @parse_ini_file($iniFilePath);
		if(empty($this->config)) {
			http_response_code(500);
			die(json_encode(["error" => "Configuration file not found"]));
		}
		//echo json_encode($this->config);
	}

	/**
	 * @param string key
	 * @return mixed
	 */
	public function get($key) {
		if(!isset($this->config[$key])) {
			http_response_code(500);
			die(json_encode(["error" => "Configuration not found: $key"]));
		}
		return $this->config[$key];
	}
}

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

/**
 * @param float $minLat
 * @param float $minLon
 * @param float $maxLat
 * @param float $maxLon
 * @return string
 */
function overpassQuery($minLat, $minLon, $maxLat, $maxLon) {
	return "[out:json][timeout:25];
	(
		node['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
		way['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
		relation['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
	);
	out body;
	>;
	out skel qt;";
}

/**
 * @param string $endpoint
 * @param string $query
 * @return string
 */
function getOverpassResult($endpoint, $query) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $endpoint);
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$result = curl_exec($ch);
	curl_close($ch);
	return $result;
}
