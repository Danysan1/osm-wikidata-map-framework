<?php

namespace App\Result\Wikidata;

require_once(__DIR__ . "/XMLWikidataQueryResult.php");
require_once(__DIR__ . "/../XMLQueryResult.php");

use \App\Result\Wikidata\XMLWikidataQueryResult;
use App\Result\XMLQueryResult;

/**
 * Result of a Wikidata stats query, convertible into matrix data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class XMLWikidataStatsQueryResult extends XMLWikidataQueryResult
{
    public static function fromXMLResult(XMLQueryResult $res): self
    {
        $result = $res->getResult();
        if ($result !== NULL && !is_string($result)) {
            throw new \Exception("XMLWikidataStatsQueryResult: result is not a string");
        }
        return new self($res->isSuccessful(), $result);
    }

    /**
     * @return array<string,string>
     */
    protected function getXMLFields(): array
    {
        return [
            "name" => "wd:literal",
            "id" => "wd:uri",
            //"count" => "xsd:integer",
            "count" => "wd:literal",
        ];
    }

    /**
     * @return array<string>
     */
    protected function getEntityXMLFields(): array
    {
        return ["id"];
    }
}
