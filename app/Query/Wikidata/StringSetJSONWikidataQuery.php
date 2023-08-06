<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\StringSet;
use \App\Query\StringSetJSONQuery;
use \App\Query\Wikidata\JSONWikidataQuery;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 */
class StringSetJSONWikidataQuery extends JSONWikidataQuery implements StringSetJSONQuery
{
    private StringSet $wikidataIDList;
    private string $language;

    public function __construct(StringSet $wikidataIDList, string $language, string $query, WikidataConfig $config)
    {
        $size = $wikidataIDList->count();
        $maxSize = $config->getMaxWikidataElements();
        if ($size === 0)
            throw new \InvalidArgumentException("The given ID list is empty");
        if ($maxSize && $size > $maxSize)
            throw new \InvalidArgumentException("The given ID list is too big ($size > $maxSize)");
        error_log("Querying Wikidata for $size items");
        
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
