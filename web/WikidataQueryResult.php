<?php
require_once("./XMLRemoteQueryResult.php");

class WikidataQueryResult extends XMLRemoteQueryResult {
    /**
     * @return array
     */
    public function getMatrixData() {
        $in = $this->getSimpleXMLElement();
        $out = [];
        
        //https://stackoverflow.com/questions/42405495/simplexml-xpath-has-empty-element
        $in->registerXPathNamespace("wd", "http://www.w3.org/2005/sparql-results#");
        $elements = $in->xpath("/wd:sparql/wd:results/wd:result");
        foreach ($elements as $element) {
            $element->registerXPathNamespace("wd", "http://www.w3.org/2005/sparql-results#");
            //error_log($element->saveXML());
            $outRow = [
                "wikidata"=>$element->xpath("./wd:binding[@name='wikidata']/wd:uri/text()"),
                "name"=>$element->xpath("./wd:binding[@name='name']/wd:literal/text()"),
                "description"=>$element->xpath("./wd:binding[@name='description']/wd:literal/text()"),
                "gender"=>$element->xpath("./wd:binding[@name='gender']/wd:literal/text()"),
                "wikipedia"=>$element->xpath("./wd:binding[@name='wikipedia']/wd:uri/text()"),
                "occupations"=>$element->xpath("./wd:binding[@name='occupations']/wd:literal/text()"),
                "pictures"=>$element->xpath("./wd:binding[@name='pictures']/wd:literal/text()"),
                "birth_date"=>$element->xpath("./wd:binding[@name='birth_date']/wd:literal/text()"),
                "death_date"=>$element->xpath("./wd:binding[@name='death_date']/wd:literal/text()"),
                "birth_place"=>$element->xpath("./wd:binding[@name='birth_place']/wd:literal/text()"),
                "death_place"=>$element->xpath("./wd:binding[@name='death_place']/wd:literal/text()")
            ];
            foreach ($outRow as $key=>$value) {
                if(empty($value)) {
                    $outRow[$key] = null;
                } else {
                    $outRow[$key] = $value[0]->__toString();
                    if($key=="pictures")
                        $outRow[$key] = explode("\t", $outRow[$key]);
                }
            }
            //print_r($outRow);
            $out[] = $outRow;
        }

        return $out;
    }
}