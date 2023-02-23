<?php

declare(strict_types=1);

namespace App\Config;

interface Configuration
{
	public function listKeys(): array;

	public function has(string $key): bool;

	/**
	 * @param array<string> $keys
	 */
	public function hasAll(array $keys): bool;

	public function get(string $key): mixed;

	public function getBool(string $key): bool;

	public function getArray(string $key): array;

	/**
	 * @return array<string> Configured OSM wikidata keys
	 */
	public function getWikidataKeys(): array;

	public function getMetaTag(string $key, ?bool $optional = false): string;

	public function isDbEnabled(): bool;

	public function getDbDatabase(): string;
}
