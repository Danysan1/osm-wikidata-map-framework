<?php

namespace App;

use Exception;

require_once(__DIR__ . "/Configuration.php");

class IniFileConfiguration implements Configuration
{
	/**
	 * @var array<string,mixed>
	 */
	private $config;

	/**
	 * @param string $iniFilePath
	 */
	public function __construct(string $iniFilePath = __DIR__ . "/../open-etymology-map.ini")
	{
		$this->config = @parse_ini_file($iniFilePath);
		if (empty($this->config)) {
			error_log("'$iniFilePath' not found or empty");
			throw new Exception("Configuration file not found");
		}
		//echo json_encode($this->config);
	}

	public function has(string $key): bool
	{
		return isset($this->config[$key]) && $this->config[$key] !== "";
	}

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get(string $key)
	{
		if (!isset($this->config[$key])) {
			throw new Exception("Configuration not found: $key");
		}
		return $this->config[$key];
	}

	public function getBool(string $key): bool
	{
		return !empty($this->config[$key]) && $this->config[$key] != "false";
	}
}
