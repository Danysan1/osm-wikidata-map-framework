<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Query\Wikidata\EtymologyIDListXMLWikidataQuery;

class EtymologyIDListWikidataFactory implements StringSetXMLQueryFactory
{
    private string $language;
    private WikidataConfig $config;

    public function __construct(string $language, WikidataConfig $config)
    {
        $this->language = $language;
        $this->config = $config;
    }

    public function create(StringSet $input): StringSetXMLQuery
    {
        return new EtymologyIDListXMLWikidataQuery($input, $this->language, $this->config);
    }

    public function getLanguage(): ?string
    {
        return $this->language;
    }
}
