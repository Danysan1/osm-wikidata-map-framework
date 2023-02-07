<?php

namespace App;

use Exception;

require_once(__DIR__ . "/Configuration.php");

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

    function getMetaTag(string $key, ?bool $optional = false): string
    {
        if ($optional && !$this->has($key))
            return "";
        else
            return '<meta name="config_' . $key . '" content="' . htmlspecialchars((string)$this->get($key)) . '" />';
    }

    public function getDbEnable(): bool
    {
        return $this->getBool("db_enable");
    }

    public function getDbDatabase(): string
    {
        return (string)$this->get("db_database");
    }
}
