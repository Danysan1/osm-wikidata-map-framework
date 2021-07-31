<?php
require_once("./QueryResult.php");

class WikidataResult extends QueryResult {
    /**
     * @return array
     */
    public function toMatrix() {
        $in = $this->parseXMLBody();
        $out = [];
        
        $elements = $in->xpath("/sparql/results/result");
        foreach ($elements as $element) {
            $out[] = [
                "wikidataURL"=>$element->xpath("/binding[@name='etymology_wikidata']/uri/text()")[0],
                "name"=>$element->xpath("/binding[@name='etymology_name']/literal/text()")[0],
                "gender"=>$element->xpath("/binding[@name='gender']/uri/text()")[0],
                "wikipediaURL"=>$element->xpath("/binding[@name='wikipedia']/uri/text()")[0],
                "occupations"=>$element->xpath("/binding[@name='occupation_names']/literal/text()")[0],
                "pictures"=>$element->xpath("/binding[@name='pictures']/literal/text()")[0],
                "birthDate"=>$element->xpath("/binding[@name='birth_date']/literal/text()")[0],
                "deathDate"=>$element->xpath("/binding[@name='death_date']/literal/text()")[0],
                "birthPlace"=>$element->xpath("/binding[@name='birth_place_name']/literal/text()")[0],
                "deathPlace"=>$element->xpath("/binding[@name='death_place_name']/literal/text()")[0]
            ];
        }

        return $out;
    }
}