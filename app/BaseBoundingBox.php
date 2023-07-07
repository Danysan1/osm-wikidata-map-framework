<?php

declare(strict_types=1);

namespace App;


use \App\BoundingBox;
use Exception;
use InvalidArgumentException;

/**
 * Implementation of a Geographic Bounding Box.
 * 
 * @see https://dev.overpass-api.de/overpass-doc/en/full_data/bbox.html#filter
 */
class BaseBoundingBox implements BoundingBox
{
    /**
     * [-90,90[
     */
    private float $minLat;

    /**
     * ]$minLat,90]
     */
    private float $maxLat;

    /**
     * ]-180,180]
     */
    private float $minLon;

    /**
     * ]-180,180] - {$minLon}
     */
    private float $maxLon;

    public function __construct(float $minLat, float $minLon, float $maxLat, float $maxLon)
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

    private static function correctLongitude(float $lon): float
    {
        if (is_nan($lon)) {
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

    private static function correctLatitude(float $lat): float
    {
        if (is_nan($lat))
            throw new \InvalidArgumentException("Invalid longitude");

        return $lat;
    }

    public function getMinLat(): float
    {
        return $this->minLat;
    }

    public function getMaxLat(): float
    {
        return $this->maxLat;
    }

    public function getMinLon(): float
    {
        return $this->minLon;
    }

    public function getMaxLon(): float
    {
        return $this->maxLon;
    }

    public function asBBoxString(): string
    {
        return $this->minLat . "," . $this->minLon . "," . $this->maxLat . "," . $this->maxLon;
    }

    public function asArray(): array
    {
        return [$this->getMinLon(), $this->getMinLat(), $this->getMaxLon(), $this->getMaxLat()];
    }

    public function isAcrossAntimeridian(): bool
    {
        return $this->minLat > $this->maxLat;
    }

    public function equals(BoundingBox $other): bool
    {
        /**
         * @psalm-suppress RedundantCondition
         */
        return !empty($other)
            && $this->minLat == $other->getMinLat()
            && $this->minLon == $other->getMinLon()
            && $this->maxLat == $other->getMaxLat()
            && $this->maxLon == $other->getMaxLon();
    }

    public function containsOrEquals(BoundingBox $other): bool
    {
        /**
         * @psalm-suppress TypeDoesNotContainType
         */
        if (empty($other))
            throw new \InvalidArgumentException("The compared BoundingBox must not be empty");

        $containsLatitude = $this->minLat <= $other->getMinLat() && $this->maxLat >= $other->getMaxLat();
        $thisMinLon = $this->isAcrossAntimeridian() ? $this->minLon - 360 : $this->minLon;
        $otherMinLon = $other->isAcrossAntimeridian() ? $other->getMinLon() - 360 : $other->getMinLon();
        $containsLongitude = $thisMinLon <= $otherMinLon && $this->maxLon >= $other->getMaxLon();
        return $containsLatitude && $containsLongitude;
    }

    public function strictlyContains(BoundingBox $other): bool
    {
        /**
         * @psalm-suppress RedundantCondition
         */
        return !empty($other) && $this->containsOrEquals($other) && !$this->equals($other);
    }

    public function getArea(): float
    {
        $latitudeDiff = $this->maxLat - $this->minLat;
        $minLon = $this->isAcrossAntimeridian() ? $this->minLon - 360 : $this->minLon;
        $longitudeDiff = $this->maxLon - $minLon;
        return abs($latitudeDiff * $longitudeDiff);
        // abs() should not be necessary as these values should already be positive, but for safety we use it anyway.
    }

    public function getOverlapWith(BoundingBox $other): ?BoundingBox
    {
        $minLat = max($this->minLat, $other->getMinLat());
        $maxLat = min($this->maxLat, $other->getMaxLat());

        $thisMinLon = $this->isAcrossAntimeridian() ? $this->minLon - 360 : $this->minLon;
        $otherMinLon = $other->isAcrossAntimeridian() ? $other->getMinLon() - 360 : $other->getMinLon();
        $minLon = max($thisMinLon, $otherMinLon);
        $maxLon = min($this->maxLon, $other->getMaxLon());

        if ($minLat > $maxLat || $minLon == $maxLon)
            return null;

        return new BaseBoundingBox($minLat, $minLon, $maxLat, $maxLon);
    }

    public function getAbsoluteOverlapAreaWith(BoundingBox $other): float
    {
        $overlap = $this->getOverlapWith($other);
        return NULL == $overlap ? 0 : $overlap->getArea();
    }

    public function getRelativeOverlapAreaWith(BoundingBox $other): float
    {
        return $this->getAbsoluteOverlapAreaWith($other) / $this->getArea();
    }

    public function __toString(): string
    {
        return "BaseBoundingBox(" . $this->minLat . "," . $this->minLon . "," . $this->maxLat . "," . $this->maxLon . ")";
    }

    /**
     * @param int $inputType See https://www.php.net/manual/en/function.filter-input.php for possible values
     */
    public static function fromInput(int $inputType = INPUT_GET, ?float $maxArea = null): BaseBoundingBox
    {
        $args = filter_input_array($inputType, [
            "minLat" => [
                "filter" => FILTER_VALIDATE_FLOAT,
                "flags" => FILTER_REQUIRE_SCALAR,
                "options" => ["decimal" => ".", "min_range" => -90, "max_range" => 90]
            ],
            "minLon" => [
                "filter" => FILTER_VALIDATE_FLOAT,
                "flags" => FILTER_REQUIRE_SCALAR,
                "options" => ["decimal" => ".", "min_range" => -180, "max_range" => 180]
            ],
            "maxLat" => [
                "filter" => FILTER_VALIDATE_FLOAT,
                "flags" => FILTER_REQUIRE_SCALAR,
                "options" => ["decimal" => ".", "min_range" => -90, "max_range" => 90]
            ],
            "maxLon" => [
                "filter" => FILTER_VALIDATE_FLOAT,
                "flags" => FILTER_REQUIRE_SCALAR,
                "options" => ["decimal" => ".", "min_range" => -180, "max_range" => 180]
            ],
        ]);

        if (empty($args))
            throw new InvalidArgumentException("Failed parsing input bounding box parameters");

        foreach ($args as $k => $v) {
            if ($v === null || $v === false)
                throw new InvalidArgumentException("$k is not a valid floating point number");
        }

        $bbox = new BaseBoundingBox(
            $args["minLat"],
            $args["minLon"],
            $args["maxLat"],
            $args["maxLon"]
        );

        $area = $bbox->getArea();
        if ($maxArea > 0 && $area > $maxArea) {
            //error_log("Requested area too large: $area > $maxArea");
            throw new Exception("The requested area is too large. Please use a smaller area.");
        }

        return $bbox;
    }
}
