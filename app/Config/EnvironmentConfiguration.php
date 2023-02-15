<?php

declare(strict_types=1);

namespace App\Config;

use Exception;

class EnvironmentConfiguration extends BaseConfiguration
{
	public function listKeys(): array
	{
		return array_keys(getenv());
	}

	public function has(string $key): bool
	{
		return getenv($key) !== false && getenv($key) !== "";
	}

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get(string $key)
	{
		if (!$this->has($key)) {
			throw new Exception("Configuration not found: $key");
		}
		return getenv($key);
	}

	public function getBool(string $key): bool
	{
		return !empty(getenv($key)) && getenv($key) != "false" && getenv($key) != "0";
	}
}
