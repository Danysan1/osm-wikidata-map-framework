<?php

namespace App;

require_once(__DIR__ . "/BaseConfiguration.php");

use Exception;

class EnvironmentConfiguration extends BaseConfiguration
{
	public function has(string $key): bool
	{
		return isset($_ENV[$key]) && $_ENV[$key] !== "";
	}

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get(string $key)
	{
		if (!isset($_ENV[$key])) {
			throw new Exception("Configuration not found: $key");
		}
		return $_ENV[$key];
	}

	public function getBool(string $key): bool
	{
		return !empty($_ENV[$key]) && $_ENV[$key] != "false";
	}
}
