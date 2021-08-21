<?php

namespace App;

interface BoundingBox {
    /**
     * @return float
     */
    public function getMinLat();

    /**
     * @return float
     */
    public function getMinLon();

    /**
     * @return float
     */
    public function getMaxLat();

    /**
     * @return float
     */
    public function getMaxLon();

    /**
     * @return string
     */
    public function asBBoxString();

    /**
     * @param BoundingBox $other
     * @return bool
     */
    public function contains(BoundingBox $other);

    /**
     * @return bool
     */
    public function isAcrossAntimeridian();

    /**
     * @return float
     */
    public function getArea();

    /**
     * @return string
     */
    public function __toString();
}