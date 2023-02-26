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
		return array_reduce(
			$this->configs,
			function (bool $found, Configuration $config) use ($key): bool {
				if ($found || $config->has($key))
					return true;

				if (!empty($_SERVER["SERVER_NAME"]) && $config->has($key . "_map")) {
					$domain = $_SERVER["SERVER_NAME"];
					$domain_value_map = json_decode((string)$config->get($key . "_map"), true);

					if (!is_array($domain_value_map))
						throw new Exception("Bad db_enable_map configuration");

					return !empty($domain_value_map[$domain]);
				}
			},
			false
		);
	}

	public function get(string $key): mixed
	{
		for ($i = 0; $i < count($this->configs); $i++) {
			if (!empty($_SERVER["SERVER_NAME"]) && $this->configs[$i]->has($key . "_map")) {
				$domain = $_SERVER["SERVER_NAME"];
				$domain_value_map = json_decode((string)$this->configs[$i]->get($key . "_map"), true);

				if (!is_array($domain_value_map))
					throw new Exception("Bad db_enable_map configuration");

				if (!empty($domain_value_map[$domain]))
					return $domain_value_map[$domain];
			}

			if ($this->configs[$i]->has($key))
				return $this->configs[$i]->get($key);
		}
		throw new Exception("Configuration not found: $key");
	}

	public function getBool(string $key): bool
	{
		return $this->has($key) && $this->get($key) !== "false";
	}
}
