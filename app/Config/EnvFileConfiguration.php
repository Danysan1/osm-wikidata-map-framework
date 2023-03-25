<?php

declare(strict_types=1);

namespace App\Config;

use \Dotenv\Dotenv;
use Exception;

class EnvFileConfiguration extends BaseConfiguration
{
    public function __construct(string $envFileFolderPath = __DIR__ . "/../..", string $envFileName = ".env")
    {
        if (!file_exists("$envFileFolderPath/$envFileName"))
            throw new Exception(".env file does not exist: '$envFileFolderPath/$envFileName'");

        $dotenv = Dotenv::createImmutable($envFileFolderPath);
        $dotenv->load();
    }
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
