<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\StringSet;
use \App\Query\StringSetXMLQuery;
use \App\Query\Wikidata\XMLWikidataQuery;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 */
abstract class StringSetXMLWikidataQuery extends XMLWikidataQuery implements StringSetXMLQuery
{
    private StringSet $wikidataIDList;
    private string $language;

    public function __construct(StringSet $wikidataIDList, string $language, string $query, WikidataConfig $config)
    {
        parent::__construct($query, $config);

        $this->wikidataIDList = $wikidataIDList;
        $this->language = $language;
    }

    public function getStringSet(): StringSet
    {
        return $this->wikidataIDList;
    }

    public function getQueryTypeCode(): string
    {
        return $this->language . "_" . parent::getQueryTypeCode();
    }
}