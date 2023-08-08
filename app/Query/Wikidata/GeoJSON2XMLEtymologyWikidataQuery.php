<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\XMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\BaseStringSet;
use App\Query\BaseQuery;
use App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\QueryResult;
use \App\Result\XMLQueryResult;
use Exception;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add return in a matrix form.
 */
class GeoJSON2XMLEtymologyWikidataQuery extends BaseQuery implements XMLQuery
{
    private array $geoJSONInputData;
    private StringSetXMLQuery $query;

    public function __construct(array $geoJSONData, StringSetXMLQueryFactory $queryFactory)
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

        $etymologyIDSet = array_reduce($geoJSONData["features"], [$this, "etymologyIDSetReducer"], []);
        $etymologyIDs = new BaseStringSet(array_keys($etymologyIDSet));

        $this->query = $queryFactory->create($etymologyIDs);
    }

    private function etymologyIDSetReducer(array $etymologyIDSet, array $feature): array
    {
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
                if (empty($etymology[OverpassEtymologyQueryResult::ETYMOLOGY_WD_ID_KEY]))
                    throw new Exception("Etymology with no Q-ID: " . json_encode($etymology));

                $QID = (string)$etymology[OverpassEtymologyQueryResult::ETYMOLOGY_WD_ID_KEY];
                if ($QID[0] != 'Q')
                    throw new Exception("Etymology with bad Q-ID: " . json_encode($etymology));

                $etymologyIDSet[$QID] = true;
                // Using PHP array keys guarantees uniqueness (set, not array)
            }
        }
        return $etymologyIDSet;
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

    public function getGeoJSONInputData(): array
    {
        return $this->geoJSONInputData;
    }

    public function getQueryTypeCode(): string
    {
        $thisClass = parent::getQueryTypeCode();
        return $thisClass . empty($this->query) ? "" : ("_" . $this->query->getQueryTypeCode());
    }

    public function __toString(): string
    {
        return parent::__toString() . ": " . $this->query;
    }
}
