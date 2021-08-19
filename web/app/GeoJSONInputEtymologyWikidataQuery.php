<?php
require_once(__DIR__ . "/GeoJSONQuery.php");
require_once(__DIR__ . "/EtymologyIDListWikidataQuery.php");

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
            throw new Exception("GeoJSON data is not a FeatureCollection");
        } elseif (empty($geoJSONData["features"])) {
            throw new Exception("GeoJSON data does not contain any features");
        } elseif (!is_array($geoJSONData["features"])) {
            throw new Exception("GeoJSON features is not an array");
        }
        $this->geoJSONInputData = $geoJSONData;

        $etymologyIDs = [];
        foreach ($geoJSONData["features"] as $feature) {
            if (empty($feature)) {
                throw new Exception("Feature is empty");
            } elseif (empty($feature["properties"]["etymologies"])) {
                throw new Exception("Feature does not contain any etymology IDs");
            } else {
                /**
                 * @psalm-suppress MixedArrayAccess
                 */
                $etymologies = $feature["properties"]["etymologies"];
                if (!is_array($etymologies)) {
                    throw new Exception("Etymology IDs is not an array");
                }
                foreach ($etymologies as $etymology) {
                    $etymologyIDs[] = (string)$etymology["id"];
                }
            }
        }

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
