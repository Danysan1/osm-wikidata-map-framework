<?php
require_once(__DIR__ . "/Configuration.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class IniFileConfiguration implements Configuration
{
	/**
	 * @var array<mixed>
	 */
	private $config;

	/**
	 * @param string $iniFilePath
	 */
	public function __construct($iniFilePath = __DIR__ . "/../open-etymology-map.ini")
	{
		$this->config = @parse_ini_file($iniFilePath);
		if (empty($this->config)) {
			http_response_code(500);
			die(json_encode(["error" => "Configuration file not found"]));
		}
		//echo json_encode($this->config);
	}

	/**
	 * @param string $key
	 * @return boolean
	 */
	public function has($key)
	{
		return isset($this->config[$key]);
	}

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get($key)
	{
		if (!isset($this->config[$key])) {
			http_response_code(500);
			die(json_encode(["error" => "Configuration not found: $key"]));
		}
		return $this->config[$key];
	}
}
