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

	public function getMetaTag(string $key, ?bool $optional = false): string;

	public function getDbEnable(): bool;

	public function getDbDatabase(): string;
}
