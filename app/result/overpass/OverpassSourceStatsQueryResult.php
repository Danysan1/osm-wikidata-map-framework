<?php

namespace App\Result\Overpass;

require_once(__DIR__ . "/../LocalQueryResult.php");
require_once(__DIR__ . "/../JSONQueryResult.php");

use \App\Result\JSONQueryResult;
use App\Result\LocalQueryResult;
use App\Result\QueryResult;

class OverpassSourceStatsQueryResult extends LocalQueryResult implements JSONQueryResult
{
    public function __construct(QueryResult $res)
    {
        $overpassQueryResult = new OverpassQueryResult($res->isSuccessful(), $res->getArray());
        $elements = $overpassQueryResult->getElements();
        parent::__construct(
            $overpassQueryResult->isSuccessful(),
            [["name" => "OpenStreetMap", "color" => "#33ff66", "count" => count($elements)]]
        );
    }

    public function getJSONData(): array
    {
        return (array)$this->getResult();
    }

    public function getArray(): array
    {
        return $this->getJSONData();
    }

    public function getJSON(): string
    {
        return json_encode($this->getJSONData());
    }
}
