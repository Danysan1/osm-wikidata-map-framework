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

    protected abstract function createQuery(string $wikidataIDList, string $language): string;

    public function __construct(StringSet $wikidataIDList, string $language, WikidataConfig $config)
    {
        $wikidataValues = implode(' ', array_map(function ($id) {
            return "wd:$id";
        }, $wikidataIDList->toArray()));

        foreach ($wikidataIDList->toArray() as $wikidataID) {
            /**
             * @psalm-suppress DocblockTypeContradiction
             */
            if (!is_string($wikidataID) || !preg_match("/^Q[0-9]+$/", $wikidataID)) {
                throw new \Exception("Invalid Wikidata ID: $wikidataID");
            }
        }

        // "en-US" => "en"
        $langMatches = [];
        if (!preg_match('/^(\w+)(-\w+)?$/', $language, $langMatches)) {
            error_log("StringSetXMLWikidataQuery: Invalid language code $language");
            throw new \Exception("Invalid language code");
        }
        $language = $langMatches[1];

        $query = $this->createQuery($wikidataValues, $language);
        //file_put_contents("StringSetXMLWikidataQuery.rq", $query);
        parent::__construct($query, $config);

        $this->wikidataIDList = $wikidataIDList;
        $this->language = $language;
    }

    /**
     * @return StringSet
     */
    public function getStringSet(): StringSet
    {
        return $this->wikidataIDList;
    }

    /**
     * @return string
     */
    public function getLanguage(): string
    {
        return $this->language;
    }
}
