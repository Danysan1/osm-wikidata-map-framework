<?php

class Configuration {
	/**
	 * @var array<mixed>
	 */
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
	 * @param string $key
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
