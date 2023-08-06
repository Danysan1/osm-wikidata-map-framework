<?php

declare(strict_types=1);

namespace App\Config\Wikidata;


use \App\Config\Configuration;
use Exception;

class BaseWikidataConfig implements WikidataConfig
{
    private string $endpoint;
    private ?int $maxMapElements;
    private ?int $maxWikidataElements;

    public function __construct(Configuration $conf)
    {
        $this->endpoint = (string)$conf->get('wikidata_endpoint');

        $maxMapElements = $conf->has("max_map_elements") ? (int)$conf->get("max_map_elements") : null;
        if ($maxMapElements !== null && $maxMapElements <= 0) {
            throw new Exception("The max_map_elements configuration must be > 0 or empty");
        }
        $this->maxMapElements = $maxMapElements;

        $maxWikidataElements = $conf->has("max_wikidata_elements") ? (int)$conf->get("max_wikidata_elements") : null;
        if ($maxWikidataElements !== null && $maxWikidataElements <= 0) {
            throw new Exception("The max_wikidata_elements configuration must be > 0 or empty");
        }
        $this->maxWikidataElements = $maxWikidataElements;
    }

    public function getEndpoint(): string
    {
        return $this->endpoint;
    }

    public function getMaxMapElements(): ?int
    {
        return $this->maxMapElements;
    }

    public function getMaxWikidataElements(): ?int
    {
        return $this->maxWikidataElements;
    }
}
