<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/RelatedEntitiesBaseWikidataQuery.php");

use App\Query\Wikidata\RelatedEntitiesBaseWikidataQuery;
use Exception;

class RelatedEntitiesCheckWikidataQuery extends RelatedEntitiesBaseWikidataQuery
{
    public function __construct(
        array $wikidataCods,
        array $relationProps,
        string|null $elementFilter,
        string $endpointURL
    ) {
        $wikidataCodsToCheck = self::getWikidataCodsToCheck($wikidataCods);
        $relationDirectPropsToCheck = self::getDirectPropsToCheck($relationProps);
        $fullElementFilter = self::getFullElementFilter($elementFilter);

        $sparqlQuery =
            "SELECT DISTINCT ?element
            WHERE {
                VALUES ?element { $wikidataCodsToCheck }.
                VALUES ?prop { $relationDirectPropsToCheck }.
                $fullElementFilter
                {
                    ?element ?prop [].
                } UNION {
                    ?element owl:sameAs [ ?prop [] ].
                }
            }";
        file_put_contents("RelatedEntitiesCheckWikidataQuery.tmp.rq", $sparqlQuery);
        parent::__construct($sparqlQuery, $endpointURL);
    }

    /**
     * @return array<string> ["Q1", "Q2", "Q3"]
     */
    public function sendAndGetWikidataCods(): array
    {
        $result = $this->sendAndGetJSONResult();
        //file_put_contents("RelatedEntitiesCheckWikidataQuery.tmp.json", $result->getJSON());

        $resultData = $result->getJSONData();
        if (empty($resultData["results"])) {
            throw new Exception("An error occurred while fetching the Wikidata codes");
        } elseif (empty($resultData["results"]["bindings"])) {
            $wikidataCods = [];
        } else {
            $resultData = $resultData["results"]["bindings"];
            $resultData = array_column($resultData, "element");
            $resultData = array_column($resultData, "value");
            $wikidataCods = str_replace("http://www.wikidata.org/entity/", "", $resultData);
        }
        return $wikidataCods;
    }
}
