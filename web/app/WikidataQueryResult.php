<?php
require_once(__DIR__."/XMLRemoteQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class WikidataQueryResult extends XMLRemoteQueryResult {
    /**
     * @return array
     */
    public function getMatrixData() {
        $xmlFields = [
            "wikidata"=>"uri",
            "wikipedia"=>"uri",
            "name"=>"literal",
            "description"=>"literal",
            "gender"=>"literal",
            "occupations"=>"literal",
            "pictures"=>"literal",
            "birth_date"=>"literal",
            "death_date"=>"literal",
            "birth_place"=>"literal",
            "death_place"=>"literal",
            "nobel_prize"=>"literal",
        ];
        $in = $this->getSimpleXMLElement();
        $out = [];
        
        //https://stackoverflow.com/questions/42405495/simplexml-xpath-has-empty-element
        $in->registerXPathNamespace("wd", "http://www.w3.org/2005/sparql-results#");
        $elements = $in->xpath("/wd:sparql/wd:results/wd:result");
        foreach ($elements as $element) {
            $element->registerXPathNamespace("wd", "http://www.w3.org/2005/sparql-results#");
            //error_log($element->saveXML());
            $outRow = [];
            foreach($xmlFields as $key=>$type) {
                $value = $element->xpath("./wd:binding[@name='$key']/wd:$type/text()");
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