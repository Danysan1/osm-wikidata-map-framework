<?php

namespace App;

interface BoundingBox {
    /**
     * @return float
     */
    public function getMinLat(): float;

    /**
     * @return float
     */
    public function getMinLon(): float;

    /**
     * @return float
     */
    public function getMaxLat(): float;

    /**
     * @return float
     */
    public function getMaxLon(): float;

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
     * @return BoundingBox|null
     */
    public function getOverlapWith(BoundingBox $other);

    /**
     * @return float
     */
    public function getAbsoluteOverlapAreaWith(BoundingBox $other): float;

    /**
     * @return float
     */
    public function getRelativeOverlapAreaWith(BoundingBox $other): float;

    /**
     * @return string
     */
    public function __toString(): string;
}