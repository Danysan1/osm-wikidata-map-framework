<?php

declare(strict_types=1);

namespace App\Config;

use Exception;

class MultiConfiguration extends BaseConfiguration
{
	/**
	 * @var array<Configuration>
	 */
	private $configs;

	/**
	 * @param array<Configuration> $configs
	 */
	public function __construct(array $configs)
	{
		if (empty($configs))
			throw new Exception();

		$this->configs = $configs;
	}

	public function listKeys(): array
	{
		return array_reduce(
			$this->configs,
			function (array $keys, Configuration $config): array {
				return array_merge($keys, $config->listKeys());
			},
			[]
		);
	}

	public function has(string $key): bool
	{
		$domainKey = empty($_SERVER["SERVER_NAME"]) ? null : $key . "_" . str_replace(".", "_", $_SERVER["SERVER_NAME"]);
		foreach ($this->configs as $config) {
			if ($config->has($key) || ($domainKey != null && $config->has($domainKey)))
				return true;
		}
		return false;
	}

	public function get(string $key): mixed
	{
		$domainKey = empty($_SERVER["SERVER_NAME"]) ? null : $key . "_" . str_replace(".", "_", $_SERVER["SERVER_NAME"]);
		foreach ($this->configs as $config) {
			if ($domainKey != null && $config->has($domainKey))
				return $config->get($domainKey);
			if ($config->has($key))
				return $config->get($key);
		}

		throw new Exception("Configuration not found: $key");
	}
}
