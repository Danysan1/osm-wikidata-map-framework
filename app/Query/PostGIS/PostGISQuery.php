<?php

declare(strict_types=1);

namespace App\Query\PostGIS;


use \PDO;
use \App\ServerTiming;
use \App\Query\Query;
use \Exception;

abstract class PostGISQuery implements Query
{
    private PDO $db;
    private ?ServerTiming $serverTiming;

    public function __construct(PDO $db, ?ServerTiming $serverTiming = null)
    {
        $this->db = $db;
        $this->serverTiming = $serverTiming;
    }

    public abstract function getSqlQuery(): string;

    protected function getDB(): PDO
    {
        return $this->db;
    }

    protected function hasServerTiming(): bool
    {
        return !empty($this->serverTiming);
    }

    protected function getServerTiming(): ServerTiming
    {
        if (empty($this->serverTiming))
            throw new Exception("getServerTiming(): No ServerTiming available");

        return $this->serverTiming;
    }

    public function getQueryTypeCode(): string
    {
        return get_class($this);
    }

    public function __toString(): string
    {
        return get_class($this);
    }
}
