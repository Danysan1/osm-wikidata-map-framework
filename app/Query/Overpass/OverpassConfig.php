<?php

declare(strict_types=1);

namespace App\Query\Overpass;

/**
 * Overpass query configuration
 */
interface OverpassConfig
{
    public function getEndpoint(): string;
    public function getMaxElements(): int|null;
    public function shouldFetchNodes(): bool;
    public function shouldFetchWays(): bool;
    public function shouldFetchRelations(): bool;
}
