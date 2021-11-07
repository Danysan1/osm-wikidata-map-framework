<?php

namespace App\Result\Wikidata;

require_once(__DIR__ . "/../XMLLocalQueryResult.php");
require_once(__DIR__ . "/../XMLQueryResult.php");

use \App\Result\XMLLocalQueryResult;
use App\Result\XMLQueryResult;

/**
 * Result of a Wikidata etymology query, convertible into matrix data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class WikidataEtymologyQueryResult extends XMLLocalQueryResult
{
    /**
     * @var array<string,string> $xpathNamespaces
     */
    private static $xpathNamespaces = [
        "wd" => "http://www.w3.org/2005/sparql-results#",
        //"geo" => "http://www.opengis.net/ont/geosparql#",
    ];

    /**
     * @var array<string,string> $xmlFields
     */
    private static $xmlFields = [
        "wikidata" => "wd:uri",
        "wikipedia" => "wd:uri",
        "commons" => "wd:literal",
        "name" => "wd:literal",
        "description" => "wd:literal",
        "instanceID" => "wd:uri",
        "gender" => "wd:literal",
        "genderID" => "wd:uri",
        "occupations" => "wd:literal",
        "pictures" => "wd:literal",
        "event_date" => "wd:literal",
        "event_date_precision" => "wd:literal",
        "start_date" => "wd:literal",
        "start_date_precision" => "wd:literal",
        "end_date" => "wd:literal",
        "end_date_precision" => "wd:literal",
        "birth_date" => "wd:literal",
        "birth_date_precision" => "wd:literal",
        "death_date" => "wd:literal",
        "death_date_precision" => "wd:literal",
        "event_place" => "wd:literal",
        "birth_place" => "wd:literal",
        "death_place" => "wd:literal",
        "prizes" => "wd:literal",
        "citizenship" => "wd:literal",
        //"wkt_coords" => "geo:wktLiteral",
        "wkt_coords" => "wd:literal",
    ];

    public static function fromXMLResult(XMLQueryResult $res): self
    {
        $result = $res->getResult();
        if ($result !== NULL && !is_string($result)) {
            throw new \Exception("WikidataEtymologyQueryResult: result is not a string");
        }
        return new self($res->isSuccessful(), $result);
    }

    /**
     * @return array
     */
    public function getMatrixData()
    {
        $in = $this->getSimpleXMLElement();
        $out = [];

        //https://stackoverflow.com/questions/42405495/simplexml-xpath-has-empty-element
        foreach (self::$xpathNamespaces as $prefix => $uri) {
            $in->registerXPathNamespace($prefix, $uri);
        }
        $elements = $in->xpath("/wd:sparql/wd:results/wd:result");
        foreach ($elements as $element) {
            foreach (self::$xpathNamespaces as $prefix => $uri) {
                $element->registerXPathNamespace($prefix, $uri);
            }
            //error_log($element->saveXML());
            $outRow = [];
            foreach (self::$xmlFields as $key => $type) {
                $value = $element->xpath("./wd:binding[@name='$key']/$type/text()");
                if (empty($value)) {
                    $outRow[$key] = null;
                } else {
                    $outValue = $value[0]->__toString();
                    if ($key == "pictures") {
                        $outRow[$key] = explode("\t", $outValue);
                    } else {
                        $outRow[$key] = $outValue;
                    }
                }
            }
            //print_r($outRow);
            $out[] = $outRow;
        }

        return $out;
    }
}
