<?php

declare(strict_types=1);

namespace App\Config;

use Exception;

abstract class BaseConfiguration implements Configuration
{
    public function hasAll(array $keys): bool
    {
        foreach ($keys as $key) {
            if (!$this->has($key))
                return false;
        }
        return true;
    }

    private static function lowLevelMetaTag(string $key, string $value): string
    {
        return '<meta name="config_' . htmlspecialchars($key) . '" content="' . htmlspecialchars($value) . '" />';
    }

    public function getMetaTag(string $key, ?bool $optional = false): string
    {
        if ($optional && !$this->has($key))
            return "";
        else
            return self::lowLevelMetaTag($key, (string)$this->get($key));
    }

    public function getArray(string $key): array
    {
        $raw = (string)$this->get($key);
        $parsed = json_decode($raw);
        if (!is_array($parsed))
            throw new Exception("The configured value for '$key' is not a JSON array: $raw");
        return $parsed;
    }

    public function getBool(string $key): bool
    {
        if (!$this->has($key))
            return false;
        $raw = $this->get($key);
        return !empty($raw) && $raw !== "false" && $raw !== "0";
    }

    /**
     * @return array<string> Configured OSM wikidata keys
     */
    public function getWikidataKeys(): array
    {
        $wikidataKeys = $this->getArray('osm_wikidata_keys');

        if (empty($wikidataKeys))
            throw new Exception("Empty osm_wikidata_keys");

        return array_map(function (mixed $item): string {
            $ret = (string)$item;
            if (!preg_match('/^[a-z_:]+$/', $ret)) //! Do not remove this validity check
                throw new Exception("Bad OSM key: '$ret'");
            return $ret;
        }, $wikidataKeys);
    }

    /**
     * @param array<string> $keys Configured OSM wikidata keys
     * @return array<string> Configured OSM wikidata key IDs
     */
    public static function keysToIDs(array $keys): array
    {
        return array_map(function (string $key): string {
            return "osm_" . str_replace(":", "_", str_replace(":wikidata", "", $key));
        }, $keys);
    }
}
