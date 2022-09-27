<?php

namespace App;

interface Configuration
{
	public function listKeys(): array;

	public function has(string $key): bool;

	/**
	 * @param array<string> $keys
	 */
	public function hasAll(array $keys): bool;

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get(string $key);

	public function getBool(string $key): bool;

	function getMetaTag(string $key, ?bool $optional = false) : string;
}
