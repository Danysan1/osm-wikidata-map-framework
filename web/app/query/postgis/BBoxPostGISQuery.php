<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxQuery.php");

use \PDO;
use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxQuery;

abstract class BBoxPostGISQuery implements BBoxQuery
{
    /**
     * @var BoundingBox $bbox
     */
    private $bbox;

    /**
     * @var PDO $db
     */
    private $db;

    /**
     * @var ServerTiming|null $serverTiming
     */
    private $serverTiming;

    /**
     * @param BoundingBox $bbox
     * @param PDO $db
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($bbox, $db, $serverTiming = null)
    {
        $this->bbox = $bbox;
        $this->db = $db;
        $this->serverTiming = $serverTiming;
    }

    protected function getDB(): PDO
    {
        return $this->db;
    }

    protected function getServerTiming(): ServerTiming
    {
        return $this->serverTiming;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    public function getQueryTypeCode(): string
    {
        return get_class($this);
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->getBBox();
    }
}
