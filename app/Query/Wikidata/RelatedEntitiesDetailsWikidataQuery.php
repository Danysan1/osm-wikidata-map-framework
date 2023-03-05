<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\Query\Wikidata\RelatedEntitiesBaseWikidataQuery;

class RelatedEntitiesDetailsWikidataQuery extends RelatedEntitiesBaseWikidataQuery
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
        $relationPropsToCheck = self::getPropsToCheck($relationProps);
        $relationPropStatementsToCheck = self::getPropStatementsToCheck($relationProps);
        $fullInstanceOfFilter = self::getFullInstanceOfFilter($instanceOfCods);
        $fullElementFilter = self::getFullElementFilter($elementFilter);

        $sparqlQuery =
            "SELECT ?element ?prop ?related
            WHERE {
                VALUES ?element { $wikidataCodsToCheck }.
                VALUES ?prop { $relationPropsToCheck }.
                VALUES ?propStatement { $relationPropStatementsToCheck }.
                $fullInstanceOfFilter
                $fullElementFilter
                {
                    ?element ?prop ?relatedStatement.
                } UNION {
                    ?element owl:sameAs [
                        ?prop ?relatedStatement
                    ].
                }
                MINUS { ?relatedStatement pq:P582 []. } # Related statement has ended
                ?relatedStatement ?propStatement ?related.
            }
            # Limiting is already applied at a higher level as paging";
        parent::__construct($sparqlQuery, $config);
    }
}
