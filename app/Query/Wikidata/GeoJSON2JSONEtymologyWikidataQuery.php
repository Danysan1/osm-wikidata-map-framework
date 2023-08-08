<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Query\BaseQuery;
use \App\Query\JSONQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\Query\Wikidata\GeoJSON2XMLEtymologyWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use \App\Result\XMLQueryResult;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add it to the feature.
 */
abstract class GeoJSON2JSONEtymologyWikidataQuery extends BaseQuery implements JSONQuery
{
    protected GeoJSON2XMLEtymologyWikidataQuery $wikidataQuery;

    public function __construct(array $geoJSONData, StringSetXMLQueryFactory $queryFactory)
    {
        $this->wikidataQuery = new GeoJSON2XMLEtymologyWikidataQuery($geoJSONData, $queryFactory);
    }

    public function send(): QueryResult
    {
        $response = $this->wikidataQuery->sendAndGetXMLResult();
        if (!$response->hasResult()) {
            throw new \Exception("Wikidata query did not return any results");
        } elseif (!$response->isSuccessful()) {
            throw new \Exception("Wikidata query did not return successful response");
        } else {
            return $this->createQueryResult($response);
        }
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }

    protected abstract function createQueryResult(XMLQueryResult $wikidataResult): JSONQueryResult;

    public function getQueryTypeCode(): string
    {
        $thisClass = parent::getQueryTypeCode();
        return $thisClass . "_" . $this->wikidataQuery->getQueryTypeCode();
    }

    public function __toString(): string
    {
        return parent::__toString() . ": " . $this->wikidataQuery;
    }
}
