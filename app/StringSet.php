<?php

declare(strict_types=1);

namespace App;

/**
 * Set of strings
 */
interface StringSet
{
    public function size(): int;

    /**
     * @return array<string>
     */
    public function toArray(): array;

    public function toJson(): string;

    /**
     * @psalm-suppress PossiblyUnusedMethod
     */
    public function equals(StringSet $other): bool;

    public function strictlyContains(StringSet $other): bool;

    public function containsOrEquals(StringSet $other): bool;

    public function __toString(): string;
}
