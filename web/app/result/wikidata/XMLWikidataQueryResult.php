<?php

namespace App\Result\Wikidata;

require_once(__DIR__ . "/../XMLLocalQueryResult.php");

use \App\Result\XMLLocalQueryResult;

/**
 * Result of a Wikidata query, convertible into matrix data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class XMLWikidataQueryResult extends XMLLocalQueryResult
{
    /**
     * @return array<string,string>
     */
    protected function getXMLNamespaces(): array
    {
        return [
            "wd" => "http://www.w3.org/2005/sparql-results#",
            //"xsd" => "http://www.w3.org/2001/XMLSchema#",
            //"geo" => "http://www.opengis.net/ont/geosparql#",
        ];
    }

    /**
     * @return array<string,string>
     */
    protected abstract function getXMLFields(): array;

    /**
     * @return array<string>
     */
    protected function getArrayXMLFields(): array
    {
        return [];
    }

    public function getMatrixData(): array
    {
        //error_log("getMatrixData(): " . json_encode(debug_backtrace()));
        $in = $this->getSimpleXMLElement();
        $out = [];

        //https://stackoverflow.com/questions/42405495/simplexml-xpath-has-empty-element
        foreach ($this->getXMLNamespaces() as $prefix => $uri) {
            $in->registerXPathNamespace($prefix, $uri);
        }
        $elements = $in->xpath("/wd:sparql/wd:results/wd:result");
        foreach ($elements as $element) {
            foreach ($this->getXMLNamespaces() as $prefix => $uri) {
                $element->registerXPathNamespace($prefix, $uri);
            }
            //error_log("getMatrixData: Parsing " . $element->saveXML());
            $outRow = [];
            foreach ($this->getXMLFields() as $key => $type) {
                $value = $element->xpath("./wd:binding[@name='$key']/$type/text()");
                if (empty($value)) {
                    $outRow[$key] = null;
                } else {
                    $outValue = $value[0]->__toString();
                    if (in_array($key, $this->getArrayXMLFields())) {
                        $outRow[$key] = explode("\t", $outValue);
                    } else {
                        $outRow[$key] = $outValue;
                    }
                }
            }
            //error_log("getMatrixData: Parsed " . json_encode($outRow));
            $out[] = $outRow;
        }

        return $out;
    }
}
