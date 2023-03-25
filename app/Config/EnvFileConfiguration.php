<?php

declare(strict_types=1);

namespace App\Config;

use \Dotenv\Dotenv;
use Exception;

/**
 * This class cannot be merged with EnvironmentConfiguration for two reasons:
 * - To keep the functionality separated allowing to choose which to use (related to single responsibility principle)
 * - PHP encourages the usage of getenv() over $_ENV and requires extra steps to allow its usage. DotEnv (the library used for loading the file) instead encourages $_ENV over getenv(). So these classes use different methods of accessing environment variables.
 * 
 * @see EnvironmentConfiguration
 * @see https://github.com/vlucas/phpdotenv#putenv-and-getenv
 * @see https://stackoverflow.com/questions/3780866/why-is-my-env-empty
 */
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
