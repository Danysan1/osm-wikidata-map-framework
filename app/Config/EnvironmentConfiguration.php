<?php

declare(strict_types=1);

namespace App\Config;

use Exception;

class EnvironmentConfiguration extends BaseConfiguration
{
	public function listKeys(): array
	{
		return array_keys($_ENV);
	}

	public function has(string $key): bool
	{
		return isset($_ENV[$key]) && $_ENV[$key] !== "";
	}

	public function get(string $key): mixed
	{
		if (!$this->has($key)) {
			throw new Exception("Configuration not found: $key");
		}
		return $_ENV[$key];
	}
}
