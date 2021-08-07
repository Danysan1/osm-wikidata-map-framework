<?php
require_once(__DIR__."/GeoJSONQuery.php");
require_once(__DIR__."/GeoJSONInputEtymologyWikidataQuery.php");

class GeoJSONEtymologyWikidataQuery implements GeoJSONQuery {
    /** @var GeoJSONInputEtymologyWikidataQuery $wikidataQuery */
    private $wikidataQuery;

    /**
     * @param array $geoJSONData
     * @param string $language
     */
    public function __construct($geoJSONData, $language, $endpointURL) {
        $this->wikidataQuery = new GeoJSONInputEtymologyWikidataQuery($geoJSONData, $language, $endpointURL);
    }

    public function getQuery()
    {
        return $this->wikidataQuery->getQuery();
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send() {
        $wikidataResponse = $this->wikidataQuery->send();
        if(!$wikidataResponse->isSuccessful() || !$wikidataResponse->hasResult()) {
            $out = $wikidataResponse;
        } else {
            $geoJSONData = $this->wikidataQuery->getGeoJSONInputData();
            $matrixData = $wikidataResponse->getMatrixData();

            for ($i=0; $i<count($geoJSONData["features"]); $i++) {
                for($j=0; $j<count($geoJSONData["features"][$i]["properties"]["etymologies"]); $j++) {
                    $wikidataID = $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["id"];
                    foreach ($matrixData as $row) {
                        if ($row["wikidata"] == "http://www.wikidata.org/entity/$wikidataID") {
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["birth_date"] = $row["birth_date"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["birth_place"] = $row["birth_place"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["death_date"] = $row["death_date"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["death_place"] = $row["death_place"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["name"] = $row["name"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["description"] = $row["description"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["gender"] = $row["gender"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["occupations"] = $row["occupations"];
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["pictures"] = $row["pictures"];
                            if(empty($geoJSONData["features"][$i]["properties"]["etymologies"][$j]["wikipedia"]) && !empty($row["wikipedia"])) {
                                $geoJSONData["features"][$i]["properties"]["etymologies"][$j]["wikipedia"] = $row["wikipedia"];
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