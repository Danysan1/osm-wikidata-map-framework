<?php

declare(strict_types=1);

namespace App;


use \App\StringSet;

/**
 * Set of strings
 */
class BaseStringSet implements StringSet
{
    /**
     * @var array<string> $stringArray
     */
    private $stringArray;

    /**
     * @param array<string> $stringArray
     */
    public function __construct($stringArray)
    {
        foreach ($stringArray as $s) {
            /**
             * @psalm-suppress DocblockTypeContradiction
             */
            if (!is_string($s))
                throw new \Exception("Non-string element passed to BaseStringSet");
        }

        $this->stringArray = $stringArray;
    }

    /**
     * @param string $json
     * @return self
     */
    public static function fromJSON($json): self
    {
        return new self(json_decode($json));
    }

    public function size(): int
    {
        return count($this->stringArray);
    }

    public function toArray(): array
    {
        return $this->stringArray;
    }

    public function toJson(): string
    {
        return json_encode($this->stringArray);
    }

    private function countEqualElements(StringSet $other): int
    {
        return count(array_intersect($this->stringArray, $other->toArray()));
    }

    public function equals(StringSet $other): bool
    {
        $countEquals = $this->countEqualElements($other);
        return $this->size() == $countEquals && $other->size() == $countEquals;
    }

    public function strictlyContains(StringSet $other): bool
    {
        $countEquals = $this->countEqualElements($other);
        return $this->size() > $countEquals && $other->size() <= $countEquals;
    }

    public function containsOrEquals(StringSet $other): bool
    {
        $countEquals = $this->countEqualElements($other);
        return $this->size() >= $countEquals && $other->size() <= $countEquals;
    }

    public function __toString(): string
    {
        return implode(", ", $this->stringArray);
    }
}
