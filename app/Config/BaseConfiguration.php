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
        return '<meta name="config_' . htmlspecialchars($key) . '" content="' . htmlspecialchars($value) . '" />' . PHP_EOL;
    }

    public function getMetaTag(string $key, ?bool $optional = false): string
    {
        if ($optional && !$this->has($key))
            return "";
        else
            return self::lowLevelMetaTag($key, (string)$this->get($key));
    }

    public function getJsonScriptTag(string $key, ?bool $optional = false): string
    {
        if ($optional && !$this->has($key))
            return "";
        else
            return '<script type="application/json" id="config_' . $key . '">' . (string)$this->get($key) . '</script>' . PHP_EOL;
    }

    /**
     * Parses a JSON encoded parameter to a PHP array or associative array
     * 
     * Multiple configuration method handle differently JSON quoting:
     * - envirnoment variables parsed from .env file by docker-compose 'env_file' parameter: quoting is optional and already handled (the JSON encoded string is passed correctly, without the quotes, despite https://docs.docker.com/compose/compose-file/compose-file-v3/#env_file saying otherwise)
     * - envirnoment variables parsed from .env file by docker CLI '--env_file' parameter: quoting is required (passing a JSON encoded string containing spaces without quotes will result in a JSON parsing error) but NOT handled by Docker (the JSON encoded string is passed as-is, with the quotes, as described in https://github.com/docker/compose/issues/8388 )
     * - .env file loaded with DotEnv (in EnvFileConfiguration): quoting is required (passing a JSON encoded string containing spaces without quotes will result in a JSON parsing error) and already handled by DotEnv (the JSON encoded string is passed correctly, without the quotes)
     * @see https://docs.docker.com/compose/compose-file/compose-file-v2/#env_file
     * @see https://docs.docker.com/compose/compose-file/compose-file-v3/#env_file
     * @see https://docs.docker.com/engine/reference/commandline/run/#env
     * @see https://github.com/docker/compose/issues/8388
     * @see https://github.com/vlucas/phpdotenv
     */
    public function getArray(string $key): array
    {
        $raw = (string)$this->get($key);

        $isQuotedObject = str_starts_with($raw, "'{") && str_ends_with($raw, "}'");
        $isQuotedArray = str_starts_with($raw, "'[") && str_ends_with($raw, "]'");
        if ($isQuotedObject || $isQuotedArray)
            $raw = substr($raw, 1, strlen($raw) - 2); // Remove the quotes (if any)

        $parsed = json_decode($raw, true);
        if (!is_array($parsed))
            throw new Exception("The configured value for '$key' is not valid JSON: $raw");

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
                error_log("The given data source key ID is not acceptable for the configured OSM keys: '$keyID'");
                throw new Exception("Bad source key ID");
            } else {
                //error_log(json_encode($wikidataKeys));
            }
        }

        return $wikidataKeys;
    }

    /**
     * @return array<string> Configured OSM wikidata key IDs
     * @psalm-suppress PossiblyUnusedMethod
     */
    public function getWikidataKeyIDs(string $keyID = "all"): array
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
