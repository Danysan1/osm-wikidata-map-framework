<?php

declare(strict_types=1);

namespace App\Query\Wikidata\Stats;

use App\Config\Wikidata\WikidataConfig;
use \App\Query\StringSetXMLQueryFactory;

abstract class StatsWikidataQueryFactory implements StringSetXMLQueryFactory
{
    protected string $language;
    protected WikidataConfig $config;

    public function __construct(string $language, WikidataConfig $config)
    {
        $this->language = $language;
        $this->config = $config;
    }

    public function getLanguage(): ?string
    {
        return $this->language;
    }
}
