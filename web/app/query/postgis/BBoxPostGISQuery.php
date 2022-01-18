<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/PostGISQuery.php");

use \PDO;
use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxQuery;
use \App\Query\PostGIS\PostGISQuery;

abstract class BBoxPostGISQuery extends PostGISQuery implements BBoxQuery
{
    /**
     * @var BoundingBox $bbox
     */
    private $bbox;

    /**
     * @param BoundingBox $bbox
     * @param PDO $db
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($bbox, $db, $serverTiming = null)
    {
        parent::__construct($db, $serverTiming);
        $this->bbox = $bbox;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    public function __toString(): string
    {
        return parent::__toString() . ", " . $this->getBBox();
    }
}
