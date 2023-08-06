<?php

declare(strict_types=1);

namespace App;

use Countable;
use JsonSerializable;

/**
 * Set of strings
 */
interface StringSet extends Countable, JsonSerializable
{
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