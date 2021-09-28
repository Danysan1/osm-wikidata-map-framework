<?php

namespace App\Query\Overpass;

/**
 * Overpass query configuration
 */
interface OverpassConfig
{
    public function getEndpoint(): string;
    public function shouldFetchNodes(): bool;
    public function shouldFetchWays(): bool;
    public function shouldFetchRelations(): bool;
}
