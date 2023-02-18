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
				return $found || $config->has($key);
			},
			false
		);
	}

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get(string $key)
	{
		for ($i = 0; $i < count($this->configs); $i++) {
			if ($this->configs[$i]->has($key))
				return $this->configs[$i]->get($key);
		}
		throw new Exception("Configuration not found: $key");
	}

	public function getBool(string $key): bool
	{
		return $this->has($key) && $this->get($key) !== "false";
	}

	public function getDbEnable(): bool
	{
		$ret = null;
		if (!empty($_SERVER["SERVER_NAME"]) && $this->has("db_enable_map")) {
			$server = $_SERVER["SERVER_NAME"];
			$db_enable_map = json_decode((string)$this->get("db_enable_map"), true);
			//error_log("db_enable_map: " . json_encode($db_enable_map));

			if (!is_array($db_enable_map))
				throw new Exception("Bad db_enable_map configuration");

			if (!empty($db_enable_map[$server]))
				$ret = (bool)$db_enable_map[$server];
		}

		if ($ret === null)
			$ret = $this->getBool("db_enable");

		return $ret;
	}

	public function getDbDatabase(): string
	{
		$ret = null;
		if (!empty($_SERVER["SERVER_NAME"]) && $this->has("db_database_map")) {
			$server = $_SERVER["SERVER_NAME"];
			$db_database_map = json_decode((string)$this->get("db_database_map"), true);
			//error_log("db_database_map: " . json_encode($db_database_map));

			if (!is_array($db_database_map))
				throw new Exception("Bad db_database_map configuration");

			if (!empty($db_database_map[$server]))
				$ret = (string)$db_database_map[$server];
		}

		if ($ret === null)
			$ret = (string)$this->get("db_database");

		return $ret;
	}
}
