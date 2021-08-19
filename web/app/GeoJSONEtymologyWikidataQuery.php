<?php
require_once(__DIR__ . "/GeoJSONQuery.php");
require_once(__DIR__ . "/GeoJSONInputEtymologyWikidataQuery.php");
require_once(__DIR__ . "/GeoJSONLocalQueryResult.php");

class GeoJSONEtymologyWikidataQuery implements GeoJSONQuery
{
    /** @var GeoJSONInputEtymologyWikidataQuery $wikidataQuery */
    private $wikidataQuery;

    /**
     * @param array $geoJSONData
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct($geoJSONData, $language, $endpointURL)
    {
        $this->wikidataQuery = new GeoJSONInputEtymologyWikidataQuery($geoJSONData, $language, $endpointURL);
    }

    public function getQuery()
    {
        return $this->wikidataQuery->getQuery();
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send()
    {
        $wikidataResponse = $this->wikidataQuery->send();
        if (!$wikidataResponse->hasResult()) {
            throw new Exception("Wikidata query did not return any results");
        } elseif (!$wikidataResponse->isSuccessful()) {
            throw new Exception("Wikidata query did not return successful response");
        } else {
            $geoJSONData = $this->wikidataQuery->getGeoJSONInputData();
            $matrixData = $wikidataResponse->getMatrixData();

            if (!is_array($geoJSONData["features"])) {
                throw new Exception("GeoJSON features is not an array");
            } else {
                $numFeatures = count($geoJSONData["features"]);
                //error_log("Number of features: " . $numFeatures);
                for ($i = 0; $i < $numFeatures; $i++) {
                    if (empty($geoJSONData["features"][$i]["properties"]["etymologies"])) {
                        throw new Exception("GeoJSON feature has no etymologies");
                    } else {
                        $etymologies = $geoJSONData["features"][$i]["properties"]["etymologies"];
                        if (!is_array($etymologies)) {
                            throw new Exception("GeoJSON feature etymologies is not an array");
                        } else {
                            $numEtymologies = count($etymologies);
                            //error_log("Number of etymologies: " . $numEtymologies);
                            for ($j = 0; $j < $numEtymologies; $j++) {
                                $wikidataID = (string)$etymologies[$j]["id"];
                                $fullWikidataID = "http://www.wikidata.org/entity/$wikidataID";
                                //error_log("Wikidata ID: " . $fullWikidataID);
                                foreach ($matrixData as $row) {
                                    //error_log($row["wikidata"]);
                                    if ($row["wikidata"] == $fullWikidataID) {
                                        $geoJSONData["features"][$i]["properties"]["etymologies"][$j] = $row;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            $out = new GeoJSONLocalQueryResult(true, $geoJSONData);
        }

        return $out;
    }
}
