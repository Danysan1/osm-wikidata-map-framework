<?php

namespace App;

require_once(__DIR__ . "/BoundingBox.php");

use \App\BoundingBox;

/**
 * Implementation of a Geographic Bounding Box.
 * 
 * @see https://dev.overpass-api.de/overpass-doc/en/full_data/bbox.html#filter
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BaseBoundingBox implements BoundingBox
{
    /**
     * [-90,90[
     * 
     * @var float
     */
    private $minLat;

    /**
     * ]$minLat,90]
     * 
     * @var float
     */
    private $maxLat;

    /**
     * ]-180,180]
     * 
     * @var float
     */
    private $minLon;

    /**
     * ]-180,180] - {$minLon}
     * 
     * @var float $maxLon
     */
    private $maxLon;

    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     */
    public function __construct($minLat, $minLon, $maxLat, $maxLon)
    {
        $this->minLat = self::correctLatitude($minLat);
        $this->maxLat = self::correctLatitude($maxLat);

        $this->minLon = self::correctLongitude($minLon);
        $this->maxLon = self::correctLongitude($maxLon);

        if ($minLat >= $maxLat) {
            throw new \InvalidArgumentException("minLat must be less than maxLat");
        }

        if ($minLon == $maxLon) {
            throw new \InvalidArgumentException("minLon must be different from maxLon");
        }
    }

    /**
     * @param float $lon
     * @return float
     */
    private static function correctLongitude($lon)
    {
        /**
         * @psalm-suppress DocblockTypeContradiction
         */
        if ($lon === null || !is_float($lon) || is_nan($lon)) {
            throw new \InvalidArgumentException("Invalid longitude");
        }

        while ($lon <= -180) {
            $lon += 360;
        }

        while ($lon > 180) {
            $lon -= 360;
        }

        return $lon;
    }

    /**
     * @param float $lat
     * @return float
     */
    private static function correctLatitude($lat)
    {
        /**
         * @psalm-suppress DocblockTypeContradiction
         */
        if ($lat === null || !is_float($lat) || is_nan($lat)) {
            throw new \InvalidArgumentException("Invalid longitude");
        }

        return $lat;
    }

    public function getMinLat()
    {
        return $this->minLat;
    }

    public function getMaxLat()
    {
        return $this->maxLat;
    }

    public function getMinLon()
    {
        return $this->minLon;
    }

    public function getMaxLon()
    {
        return $this->maxLon;
    }

    public function asBBoxString()
    {
        return $this->minLat . "," . $this->minLon . "," . $this->maxLat . "," . $this->maxLon;
    }

    public function isAcrossAntimeridian()
    {
        return $this->minLat > $this->maxLat;
    }

    public function contains(BoundingBox $other)
    {
        $containsLatitude = $this->minLat <= $other->getMinLat() && $this->maxLat >= $other->getMaxLat();
        $thisMinLon = $this->isAcrossAntimeridian() ? $this->minLon - 360 : $this->minLon;
        $otherMinLon = $other->isAcrossAntimeridian() ? $other->getMinLon() - 360 : $other->getMinLon();
        $containsLongitude = $thisMinLon <= $otherMinLon && $this->maxLon >= $other->getMaxLon();
        return $containsLatitude && $containsLongitude;
    }

    public function getArea()
    {
        $latitudeDiff = $this->maxLat - $this->minLat;
        $minLon = $this->isAcrossAntimeridian() ? $this->minLon - 360 : $this->minLon;
        $longitudeDiff = $this->maxLon - $minLon;
        return $latitudeDiff * $longitudeDiff;
    }

    public function __toString()
    {
        return self::class . "(minLat " . $this->minLat . ", minLon " . $this->minLon . ", maxLat " . $this->maxLat . ", maxLon " . $this->maxLon . ")";
    }
}
