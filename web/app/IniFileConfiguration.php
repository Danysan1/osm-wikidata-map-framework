<?php

namespace App;

use Exception;

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
			throw new Exception("Configuration file not found");
		}
		//echo json_encode($this->config);
	}

	/**
	 * @param string $key
	 * @return boolean
	 */
	public function has($key)
	{
		return isset($this->config[$key]) && $this->config[$key] !== "";
	}

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get($key)
	{
		if (!isset($this->config[$key])) {
			throw new Exception("Configuration not found: $key");
		}
		return $this->config[$key];
	}
}
