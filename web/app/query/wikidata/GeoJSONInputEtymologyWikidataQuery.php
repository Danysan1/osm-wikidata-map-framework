<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/EtymologyIDListWikidataQuery.php");

use \App\Query\Wikidata\EtymologyIDListWikidataQuery;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add return in a matrix form.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GeoJSONInputEtymologyWikidataQuery extends EtymologyIDListWikidataQuery
{
    /**
     * @var array
     */
    private $geoJSONInputData;

    /**
     * @param array $geoJSONData
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct($geoJSONData, $language, $endpointURL)
    {
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
        $etymologyIDs = array_keys($etymologyIDSet);

        parent::__construct($etymologyIDs, $language, $endpointURL);
    }

    /**
     * @return array
     */
    public function getGeoJSONInputData()
    {
        return $this->geoJSONInputData;
    }
}
