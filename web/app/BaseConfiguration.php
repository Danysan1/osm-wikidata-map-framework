<?php

namespace App;

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

    function getMetaTag(string $key, ?bool $optional = false) : string {
        if ($optional && !$this->has($key))
            return "";
        else
            return '<meta name="config_'.$key.'" content="'.htmlspecialchars($this->get($key)).'" />';
    }
}
