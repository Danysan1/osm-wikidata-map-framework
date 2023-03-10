<?php

declare(strict_types=1);

namespace App\Config;

use Exception;

class IniFileConfiguration extends BaseConfiguration
{
	/**
	 * @var array<string,mixed>
	 */
	private $config;

	public function __construct(string $iniFilePath = __DIR__ . "/../../open-etymology-map.ini")
	{
		$this->config = @parse_ini_file($iniFilePath);
		if (empty($this->config)) {
			error_log("'$iniFilePath' not found or empty");
			throw new Exception("Configuration file not found");
		}
		//echo json_encode($this->config);
	}

	public function listKeys(): array
	{
		return array_keys($this->config);
	}

	public function has(string $key): bool
	{
		return isset($this->config[$key]) && $this->config[$key] !== "";
	}

	public function get(string $key): mixed
	{
		if (!isset($this->config[$key])) {
			throw new Exception("Configuration not found: $key");
		}
		return $this->config[$key];
	}
}
