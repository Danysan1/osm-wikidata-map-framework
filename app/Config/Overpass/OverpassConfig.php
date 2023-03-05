<?php

declare(strict_types=1);

namespace App\Config\Overpass;

/**
 * Overpass query configuration
 */
interface OverpassConfig
{
    public function getEndpoint(): string;
    public function getMaxElements(): ?int;
    public function shouldFetchNodes(): bool;
    public function shouldFetchWays(): bool;
    public function shouldFetchRelations(): bool;
    public function getBaseFilterKey(): string;
}
