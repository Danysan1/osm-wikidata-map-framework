<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../../StringSet.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/XMLWikidataQuery.php");

use App\StringSet;
use App\Query\StringSetXMLQuery;
use \App\Query\Wikidata\XMLWikidataQuery;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class StringSetXMLWikidataQuery extends XMLWikidataQuery implements StringSetXMLQuery
{
    /**
     * @var StringSet
     */
    private $wikidataIDList;

    /**
     * @var string $language
     */
    private $language;

    protected abstract function createQuery(string $wikidataIDList, string $language): string;

    /**
     * @param StringSet $wikidataIDList
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct(StringSet $wikidataIDList, $language, $endpointURL)
    {
        $this->wikidataIDList = $wikidataIDList;
        $this->language = $language;

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

        if (!preg_match("/^[a-z]{2}$/", $language)) {
            error_log("EtymologyIDListWikidataQuery: Invalid language code $language");
            throw new \Exception("Invalid language code, it must be two letters");
        }

        parent::__construct($this->createQuery($wikidataValues, $language), $endpointURL);
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
