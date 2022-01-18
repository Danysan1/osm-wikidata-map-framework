<?php

namespace App\Result\Wikidata;

require_once(__DIR__ . "/XMLWikidataQueryResult.php");
require_once(__DIR__ . "/../XMLQueryResult.php");

use \App\Result\Wikidata\XMLWikidataQueryResult;
use App\Result\XMLQueryResult;

/**
 * Result of a Wikidata etymology query, convertible into matrix data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class XMLWikidataEtymologyQueryResult extends XMLWikidataQueryResult
{
    public static function fromXMLResult(XMLQueryResult $res): self
    {
        $result = $res->getResult();
        if ($result !== NULL && !is_string($result)) {
            throw new \Exception("XMLWikidataEtymologyQueryResult: result is not a string");
        }
        return new self($res->isSuccessful(), $result);
    }

    /**
     * @return array<string,string>
     */
    protected function getXMLFields(): array
    {
        return [
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
            //"event_date_precision" => "xsd:integer",
            "event_date_precision" => "wd:literal",
            "start_date" => "wd:literal",
            //"start_date_precision" => "xsd:integer",
            "start_date_precision" => "wd:literal",
            "end_date" => "wd:literal",
            //"end_date_precision" => "xsd:integer",
            "end_date_precision" => "wd:literal",
            "birth_date" => "wd:literal",
            //"birth_date_precision" => "xsd:integer",
            "birth_date_precision" => "wd:literal",
            "death_date" => "wd:literal",
            //"death_date_precision" => "xsd:integer",
            "death_date_precision" => "wd:literal",
            "event_place" => "wd:literal",
            "birth_place" => "wd:literal",
            "death_place" => "wd:literal",
            "prizes" => "wd:literal",
            "citizenship" => "wd:literal",
            //"wkt_coords" => "geo:wktLiteral",
            "wkt_coords" => "wd:literal",
        ];
    }

    /**
     * @return array<string>
     */
    protected function getArrayXMLFields(): array
    {
        return ["pictures"];
    }

    /**
     * @return array<string>
     */
    protected function getEntityXMLFields(): array
    {
        return ["wikidata", "instanceID", "genderID"];
    }
}
