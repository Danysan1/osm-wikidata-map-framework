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
     * $this has the same values as $other
     * 
     * @param BoundingBox $other
     * @return bool
     */
    public function equals(BoundingBox $other);

    /**
     * $other is a subset of $this.
     * 
     * @param BoundingBox $other
     * @return bool
     */
    public function containsOrEquals(BoundingBox $other);

    /**
     * $other is a proper subset of $this (subset, not equal and not null).
     * 
     * @param BoundingBox $other
     * @return bool
     */
    public function strictlyContains(BoundingBox $other);

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