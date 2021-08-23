<?php

namespace App\Result;

/**
 * Result of a query
 * 
 * @see Query 
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface QueryResult {
    /**
     * @return boolean
     */
    public function isSuccessful(): bool;

    /**
     * @return boolean
     */
    public function hasResult(): bool;

    /**
     * @return mixed
     */
    public function getResult(): mixed;

    /**
     * @return array
     */
    public function getArray(): array;

    /**
     * @return string
     */
    public function __toString(): string;
}