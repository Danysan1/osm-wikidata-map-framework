<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/RelatedEntitiesBaseWikidataQuery.php");

use App\Query\Wikidata\RelatedEntitiesBaseWikidataQuery;

class RelatedEntitiesDetailsWikidataQuery extends RelatedEntitiesBaseWikidataQuery
{
    public function __construct(
        array $wikidataCods,
        array $relationProps,
        string|null $elementFilter,
        string $endpointURL
    ) {
        $wikidataCodsToCheck = self::getWikidataCodsToCheck($wikidataCods);
        $relationPropsToCheck = self::getPropsToCheck($relationProps);
        $relationPropStatementsToCheck = self::getPropStatementsToCheck($relationProps);
        $fullElementFilter = self::getFullElementFilter($elementFilter);

        $sparqlQuery =
            "SELECT ?element ?prop ?related
            WHERE {
                VALUES ?element { $wikidataCodsToCheck }.
                VALUES ?prop { $relationPropsToCheck }.
                VALUES ?propStatement { $relationPropStatementsToCheck }.
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
            }";
        file_put_contents("RelatedEntitiesDetailsWikidataQuery.tmp.rq", $sparqlQuery);
        parent::__construct($sparqlQuery, $endpointURL);
    }
}
