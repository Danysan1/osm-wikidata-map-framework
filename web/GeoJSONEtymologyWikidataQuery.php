<?php
require_once("./GeoJSONQuery.php");
require_once("./GeoJSONInputEtymologyWikidataQuery.php");

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
                $wikidataID = $geoJSONData["features"][$i]["properties"]["name:etymology:wikidata"];
                foreach ($matrixData as $row) {
                    if ($row["wikidata"] == "http://www.wikidata.org/entity/$wikidataID") {
                        $geoJSONData["features"][$i]["properties"]["name:etymology:birth_date"] = $row["birth_date"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:birth_place"] = $row["birth_place"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:death_date"] = $row["death_date"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:death_place"] = $row["death_place"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:name"] = $row["name"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:description"] = $row["description"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:gender"] = $row["gender"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:occupations"] = $row["occupations"];
                        $geoJSONData["features"][$i]["properties"]["name:etymology:pictures"] = $row["pictures"];
                        if(empty($geoJSONData["features"][$i]["properties"]["name:etymology:wikipedia"]) && !empty($row["wikipedia"])) {
                            $geoJSONData["features"][$i]["properties"]["name:etymology:wikipedia"] = $row["wikipedia"];
                        }
                    }
                }
            }
            $out = new GeoJSONLocalQueryResult(true, $geoJSONData);
        }

        return $out;
    }
}