<?php
require_once(__DIR__ . "/OverpassQuery.php");
require_once(__DIR__ . "/BaseQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxOverpassQuery extends OverpassQuery
{
    /**
     * @var float
     */
    private $minLat, $minLon, $maxLat, $maxLon;

    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @param string $query
     * @param string $endpointURL
     */
    public function __construct($minLat, $minLon, $maxLat, $maxLon, $query, $endpointURL)
    {
        parent::__construct($query, $endpointURL);
        $this->minLat = $minLat;
        $this->minLon = $minLon;
        $this->maxLat = $maxLat;
        $this->maxLon = $maxLon;
    }

    /**
     * @return float
     */
    public function getMinLat()
    {
        return $this->minLat;
    }

    /**
     * @return float
     */
    public function getMinLon()
    {
        return $this->minLon;
    }

    /**
     * @return float
     */
    public function getMaxLat()
    {
        return $this->maxLat;
    }

    /**
     * @return float
     */
    public function getMaxLon()
    {
        return $this->maxLon;
    }

    /**
     * @return string
     */
    public function getBBoxString()
    {
        return $this->minLat . "," . $this->minLon . "," . $this->maxLat . "," . $this->maxLon;
    }
}
