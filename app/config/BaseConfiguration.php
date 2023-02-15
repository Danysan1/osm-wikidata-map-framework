<?php

declare(strict_types=1);

namespace App\Config;

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
            return self::lowLevelMetaTag($key, $this->get($key));
    }

    public function getDbEnable(): bool
    {
        return $this->getBool("db_enable");
    }

    public function getDbEnableMetaTag(): string
    {
        return self::lowLevelMetaTag("db_enable", json_encode($this->getDbEnable()));
    }

    public function getDbDatabase(): string
    {
        return (string)$this->get("db_database");
    }
}
