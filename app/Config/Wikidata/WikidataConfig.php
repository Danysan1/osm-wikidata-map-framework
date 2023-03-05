<?php

declare(strict_types=1);

namespace App\Config\Wikidata;

/**
 * Wikidata query configuration
 */
interface WikidataConfig
{
    public function getEndpoint(): string;
    public function getMaxElements(): ?int;
}
