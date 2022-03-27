<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/JSONWikidataQuery.php");

use App\Query\Wikidata\JSONWikidataQuery;
use InvalidArgumentException;

class RelatedEntitiesWikidataQuery extends JSONWikidataQuery
{
    public function __construct(
        array $wikidataCods,
        array $relationProps,
        string|null $elementFilter,
        string $endpointURL
    ) {
        if (empty($wikidataCods)) {
            throw new InvalidArgumentException("Empty wikidataCods");
        } else {
            $wikidataCodArray = array_map(function ($prop) {
                return "wd:$prop";
            }, $wikidataCods);
            $wikidataCodsToCheck = implode(" ", $wikidataCodArray);
            // ["Q1","Q2"] => "wd:Q1 wd:Q2"
        }

        if (empty($relationProps)) {
            throw new InvalidArgumentException("Empty relationProps");
        } else {
            $relationPropArray = array_map(function ($prop) {
                return "p:$prop";
            }, $relationProps);
            $relationPropsToCheck = implode(" ", $relationPropArray);
            // ["P1","P2"] => "p:P1 p:P2"

            $relationPropStatementArray = array_map(function ($prop) {
                return "ps:$prop";
            }, $relationProps);
            $relationPropStatementsToCheck = implode(" ", $relationPropStatementArray);
            // ["P1","P2"] => "ps:P1 ps:P2"
        }

        if (empty($elementFilter))
            $fullElementFilter = '';
        else
            $fullElementFilter = "?element $elementFilter.";

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
                MINUS { ?relatedStatement pq:P582 ?relatedStatementEnd. }
                ?relatedStatement ?propStatement ?related.
            }";
        //file_put_contents("RelatedEntitiesWikidataQuery.rq", $sparqlQuery);
        parent::__construct($sparqlQuery, $endpointURL);
    }
}
