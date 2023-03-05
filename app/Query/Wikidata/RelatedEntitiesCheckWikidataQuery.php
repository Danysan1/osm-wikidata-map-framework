<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\Query\Wikidata\RelatedEntitiesBaseWikidataQuery;
use Exception;

class RelatedEntitiesCheckWikidataQuery extends RelatedEntitiesBaseWikidataQuery
{
    /**
     * @param array<string> $wikidataCods List of wikidata cods for entities to check
     * @param array<string> $relationProps List of wikidata cods for properties to check
     * @param ?array<string> $instanceOfCods 
     */
    public function __construct(
        array $wikidataCods,
        array $relationProps,
        ?string $elementFilter,
        ?array $instanceOfCods,
        WikidataConfig $config
    ) {
        $wikidataCodsToCheck = self::getWikidataCodsToCheck($wikidataCods);
        $relationDirectPropsToCheck = self::getDirectPropsToCheck($relationProps);
        $fullInstanceOfFilter = self::getFullInstanceOfFilter($instanceOfCods);
        $fullElementFilter = self::getFullElementFilter($elementFilter);

        $sparqlQuery =
            "SELECT DISTINCT ?element
            WHERE {
                VALUES ?element { $wikidataCodsToCheck }.
                VALUES ?prop { $relationDirectPropsToCheck }.
                $fullInstanceOfFilter
                $fullElementFilter
                {
                    ?element ?prop [].
                } UNION {
                    ?element owl:sameAs [ ?prop [] ].
                }
            }
            # Limiting is already applied at a higher level as paging";
        parent::__construct($sparqlQuery, $config);
    }

    /**
     * @return array<string> ["Q1", "Q2", "Q3"]
     */
    public function sendAndGetWikidataCods(): array
    {
        $result = $this->sendAndGetJSONResult();

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
