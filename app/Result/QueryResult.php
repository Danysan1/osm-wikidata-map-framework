<?php

declare(strict_types=1);

namespace App\Result;

/**
 * Result of a query
 * 
 * @see Query 
 */
interface QueryResult
{
    public function isSuccessful(): bool;

    public function hasResult(): bool;

    /**
     * @return mixed
     */
    public function getResult();

    public function hasPublicSourcePath(): bool;

    public function getPublicSourcePath(): string;

    public function getArray(): array;

    public function __toString(): string;
}
