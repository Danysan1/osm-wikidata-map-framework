<?php

namespace App;

require_once(__DIR__ . "/Configuration.php");

use Exception;
use App\Configuration;

class MultiConfiguration implements Configuration
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

	public function has(string $key): bool
	{
		return array_reduce($this->configs, function (
			bool $found,
			Configuration $config
		) use ($key): bool {
			return $found || $config->has($key);
		}, false);
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
}
