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

    protected function keyToID(string $key): string
    {
        return "osm_" . str_replace(":", "_", str_replace(":wikidata", "", $key));
    }

    /**
     * @return array<string> Configured OSM wikidata keys
     */
    public function getWikidataKeys(?string $keyID = "all"): array
    {
        $wikidataKeys = $this->getArray('osm_wikidata_keys');

        if (empty($wikidataKeys))
            throw new Exception("Empty osm_wikidata_keys");

        $wikidataKeys = array_map(function (mixed $item): string {
            //! Do not remove these validity checks
            $ret = (string)$item;
            if ("wikidata" == $ret)
                throw new Exception("'wikidata' should not be used in osm_wikidata_keys");
            if (!preg_match('/^[a-z_:]+$/', $ret))
                throw new Exception("Bad OSM key found in osm_wikidata_keys: '$ret'");
            return $ret;
        }, $wikidataKeys);

        if ($keyID != "all") {
            $wikidataKeys = array_filter($wikidataKeys, function ($key) use ($keyID) {
                return $this->keyToID($key) == $keyID;
            });
            if (empty($wikidataKeys)) {
                throw new Exception("Given key is not acceptable for the configured keys");
            } else {
                //error_log(json_encode($wikidataKeys));
            }
        }

        return $wikidataKeys;
    }

    /**
     * @return array<string> Configured OSM wikidata key IDs
     */
    public function getWikidataKeyIDs(?string $keyID = "all"): array
    {
        $allIDs = array_map([$this, "keyToID"], $this->getWikidataKeys());
        if ($keyID == "all") {
            return $allIDs;
        } else {
            if (!in_array($keyID, $allIDs))
                throw new Exception("Given key is not acceptable for the configured keys");
            return [$keyID];
        }
    }
}
