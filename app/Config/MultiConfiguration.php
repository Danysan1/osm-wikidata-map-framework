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

				$mapKey = $key . "_map";
				if (!empty($_SERVER["SERVER_NAME"]) && $config->has($mapKey)) {
					$domain = $_SERVER["SERVER_NAME"];
					$domain_value_map = $config->getArray($mapKey);

					if (!is_array($domain_value_map))
						throw new Exception("Bad $mapKey configuration");

					return !empty($domain_value_map[$domain]);
				}

				return false;
			},
			false
		);
	}

	public function get(string $key): mixed
	{
		$mapKey = $key . "_map";
		for ($i = 0; $i < count($this->configs); $i++) {
			if (!empty($_SERVER["SERVER_NAME"]) && $this->configs[$i]->has($mapKey)) {
				$domain = $_SERVER["SERVER_NAME"];
				$domain_value_map = $this->configs[$i]->getArray($mapKey);

				if (!is_array($domain_value_map))
					throw new Exception("Bad $mapKey configuration");

				if (isset($domain_value_map[$domain]))
					return is_array($domain_value_map[$domain]) ? json_encode($domain_value_map[$domain]) : $domain_value_map[$domain];
			}

			if ($this->configs[$i]->has($key))
				return $this->configs[$i]->get($key);
		}

		throw new Exception("Configuration not found: $key");
	}
}
