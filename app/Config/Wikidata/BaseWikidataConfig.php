<?php

declare(strict_types=1);

namespace App\Config\Wikidata;


use \App\Config\Configuration;
use Exception;

class BaseWikidataConfig implements WikidataConfig
{
    private string $endpoint;
    private ?int $maxElements;

    public function __construct(Configuration $conf)
    {
        $this->endpoint = (string)$conf->get('wikidata_endpoint');

        $maxElements = $conf->has("max_elements") ? (int)$conf->get("max_elements") : null;
        if ($maxElements !== null && $maxElements <= 0) {
            throw new Exception("maxElements must be > 0");
        }
        $this->maxElements = $maxElements;
    }

    public function getEndpoint(): string
    {
        return $this->endpoint;
    }

    public function getMaxElements(): ?int
    {
        return $this->maxElements;
    }
}
