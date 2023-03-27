<?php

declare(strict_types=1);

namespace App;

interface BoundingBox
{
    public function getMinLat(): float;

    public function getMinLon(): float;

    public function getMaxLat(): float;

    public function getMaxLon(): float;

    public function asBBoxString(): string;

    /**
     * @see https://www.rfc-editor.org/rfc/rfc7946#section-5
     */
    public function asArray(): array;

    public function equals(BoundingBox $other): bool;

    /**
     * $other is a subset of $this.
     */
    public function containsOrEquals(BoundingBox $other): bool;

    /**
     * $other is a proper subset of $this (subset, not equal and not null).
     */
    public function strictlyContains(BoundingBox $other): bool;

    public function isAcrossAntimeridian(): bool;

    public function getArea(): float;

    public function getOverlapWith(BoundingBox $other): ?BoundingBox;

    /**
     * Absolute overlap, >= 0
     */
    public function getAbsoluteOverlapAreaWith(BoundingBox $other): float;

    /**
     * Relative overlap, between 0 and 1
     */
    public function getRelativeOverlapAreaWith(BoundingBox $other): float;

    public function __toString(): string;
}
