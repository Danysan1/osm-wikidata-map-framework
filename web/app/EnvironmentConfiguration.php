<?php

namespace App;

use Exception;

require_once(__DIR__ . "/Configuration.php");

class EnvironmentConfiguration implements Configuration
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
