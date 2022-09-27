<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../XMLQuery.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");
require_once(__DIR__ . "/../../BaseStringSet.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/XMLQueryResult.php");

use \App\Query\XMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\BaseStringSet;
use App\Result\QueryResult;
use App\Result\XMLQueryResult;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add return in a matrix form.
 */
class GeoJSON2XMLEtymologyWikidataQuery implements XMLQuery
{
    /**
     * @var array
     */
    private $geoJSONInputData;

    /**
     * @var StringSetXMLQuery
     */
    private $query;

    /**
     * @param array $geoJSONData
     * @param StringSetXMLQueryFactory $queryFactory
     */
    public function __construct($geoJSONData, $queryFactory)
    {
        $this->geoJSONInputData = $geoJSONData;

        if (empty($geoJSONData["type"]) || $geoJSONData["type"] != "FeatureCollection") {
            throw new \Exception("GeoJSON data is not a FeatureCollection");
        } elseif (empty($geoJSONData["features"])) {
            throw new \Exception("GeoJSON data does not contain any features");
        } elseif (!is_array($geoJSONData["features"])) {
            throw new \Exception("GeoJSON features is not an array");
        }
        $this->geoJSONInputData = $geoJSONData;

        $etymologyIDSet = [];
        foreach ($geoJSONData["features"] as $feature) {
            if (empty($feature)) {
                throw new \Exception("Feature is empty");
            } elseif (empty($feature["properties"]["etymologies"])) {
                throw new \Exception("Feature does not contain any etymology IDs");
            } else {
                /**
                 * @psalm-suppress MixedArrayAccess
                 */
                $etymologies = $feature["properties"]["etymologies"];
                if (!is_array($etymologies)) {
                    throw new \Exception("Etymology IDs is not an array");
                }
                foreach ($etymologies as $etymology) {
                    $etymologyIDSet[(string)$etymology["id"]] = true; // Using array keys guarantees uniqueness
                }
            }
        }
        $etymologyIDs = new BaseStringSet(array_keys($etymologyIDSet));

        $this->query = $queryFactory->create($etymologyIDs);
    }

    public function send(): QueryResult
    {
        return $this->query->send();
    }

    public function sendAndGetXMLResult(): XMLQueryResult
    {
        $res = $this->send();
        if (!$res instanceof XMLQueryResult) {
            throw new \Exception("Query result is not an XMLQueryResult");
        }
        return $res;
    }

    public function getQuery(): string
    {
        return $this->query->getQuery();
    }

    /**
     * @return array
     */
    public function getGeoJSONInputData(): array
    {
        return $this->geoJSONInputData;
    }

    public function getQueryTypeCode(): string
    {
        $className = get_class($this);
        $startPos = strrpos($className, "\\");
        $thisClass = substr($className, $startPos ? $startPos + 1 : 0); // class_basename();
        return $thisClass . empty($this->wikidataQuery) ? "" : ("_" . $this->wikidataQuery->getQueryTypeCode());
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->query;
    }
}
