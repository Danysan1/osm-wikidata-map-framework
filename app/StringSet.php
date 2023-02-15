<?php

declare(strict_types=1);

namespace App;

/**
 * Set of strings
 */
interface StringSet {
    public function size(): int;

    /**
     * @return array<string>
     */
    public function toArray(): array;

    /**
     * @return string
     */
    public function toJson(): string;

    /**
     * @param StringSet $other
     * @return bool
     */
    public function equals(StringSet $other): bool;

    /**
     * @param StringSet $other
     * @return bool
     */
    public function strictlyContains(StringSet $other): bool;

    /**
     * @param StringSet $other
     * @return bool
     */
    public function containsOrEquals(StringSet $other): bool;

    /**
     * @return string
     */
    public function __toString(): string;
}