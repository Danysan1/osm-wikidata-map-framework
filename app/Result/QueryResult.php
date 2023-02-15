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
    /**
     * @return boolean
     */
    public function isSuccessful(): bool;

    /**
     * @return bool
     */
    public function hasResult(): bool;

    /**
     * @return mixed
     */
    public function getResult();

    /**
     * @return bool
     */
    public function hasPublicSourcePath(): bool;

    /**
     * @return string
     */
    public function getPublicSourcePath(): string;

    /**
     * @return array
     */
    public function getArray(): array;

    /**
     * @return string
     */
    public function __toString(): string;
}
