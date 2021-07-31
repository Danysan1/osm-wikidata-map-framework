<?php
require_once("./WikidataResult.php");

class WikidataQuery {
    /**
     * @var string
     */
    private $query;

    /**
     * @param string $query
     */
    public function __construct($query) {
        $this->query = $query;
    }

    /**
     * @param array $wikidataIDList
     * @param string $language
     * @return WikidataQuery
     */
    public static function FromIDList($wikidataIDList, $language) {
        $wikidataValues = implode(' ', array_map(function($id){return "wd:$id";}, $wikidataIDList));

        foreach($wikidataIDList as $wdID) {
            if(!is_string($wdID) || !preg_match("/^Q[0-9]+$/", $wdID)) {
                http_response_code(400);
                die(json_encode(array("error" => "All Wikidata IDs must be valid strings")));
            }
        }

        if(!preg_match("/^[a-z]{2}$/", $language)) {
            http_response_code(400);
            die(json_encode(array("error" => "Invalid language code")));
        }

        return new self(
            "SELECT ?etymology_wikidata
            (SAMPLE(?etymology_name) AS ?etymology_name)
            (SAMPLE(?gender) AS ?gender)
            (SAMPLE(?wikipedia) AS ?wikipedia)
            (GROUP_CONCAT(DISTINCT ?occupation_name;SEPARATOR=', ') AS ?occupation_names)
            (GROUP_CONCAT(DISTINCT ?picture;SEPARATOR='\t') AS ?pictures)
            (SAMPLE(?birth_date) AS ?birth_date)
            (SAMPLE(?death_date) AS ?death_date)
            (SAMPLE(?birth_place_name) AS ?birth_place_name)
            (SAMPLE(?death_place_name) AS ?death_place_name)
        WHERE {
            VALUES ?etymology_wikidata { $wikidataValues }
        
            ?etymology_wikidata rdfs:label ?etymology_name.
            FILTER(lang(?etymology_name)='$language').
        
            OPTIONAL {
                ?etymology_wikidata wdt:P106 ?occupation.
                ?occupation rdfs:label ?occupation_name.
                FILTER(lang(?occupation_name)='$language').
            }
        
            OPTIONAL {
                ?etymology_wikidata wdt:P18 ?picture.
            }
        
            OPTIONAL {
                ?etymology_wikidata wdt:P21 ?gender.
            }
        
            OPTIONAL {
                ?etymology_wikidata wdt:P569 ?birth_date.
            }
        
            OPTIONAL {
                ?etymology_wikidata wdt:P570 ?death_date.
            }
        
            OPTIONAL {
                ?etymology_wikidata wdt:P19 ?birth_place.
                ?birth_place rdfs:label ?birth_place_name.
                FILTER(lang(?birth_place_name)='$language').
            }
        
            OPTIONAL {
                ?etymology_wikidata wdt:P20 ?death_place.
                ?death_place rdfs:label ?death_place_name.
                FILTER(lang(?death_place_name)='$language').
            }
        
            OPTIONAL {
                ?wikipedia schema:about ?etymology_wikidata;
                    schema:inLanguage ?wikipedia_lang;
                    schema:isPartOf [ wikibase:wikiGroup 'wikipedia' ].
                FILTER(?wikipedia_lang = '$language').
            }
        }
        GROUP BY ?etymology_wikidata"
        );
    }
    
    /**
     * @return string
     */
    public function getQuery() {
        return $this->query;
    }

    /**
     * @param string $endpoint
     * @return WikidataResult
     */
    public function send($endpoint) {
        $ch = curl_init();
        $url = "$endpoint?".http_build_query(["query"=>$this->query]);
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        curl_close($ch);
        if(!$result)
            $result = null;
        else
            assert(is_string($result));
        return new WikidataResult($result, $curlInfo);
    }
}
