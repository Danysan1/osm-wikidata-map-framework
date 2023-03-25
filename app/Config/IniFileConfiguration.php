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

	public function __construct(string $iniFilePath = __DIR__ . "/../../owmf.ini")
	{
        if (!file_exists($iniFilePath))
            throw new Exception(".ini file does not exist: '$iniFilePath'");
		
		$this->config = @parse_ini_file($iniFilePath);
		if (empty($this->config))
			throw new Exception("Failed loading .ini configuration: '$iniFilePath'");
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
