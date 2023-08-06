<?php

declare(strict_types=1);

namespace App\Config\Wikidata;

/**
 * Wikidata query techincal configuration parameters
 */
interface WikidataConfig
{
    public function getEndpoint(): string;
    public function getMaxMapElements(): ?int;
    public function getMaxWikidataElements(): ?int;
}
