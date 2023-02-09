<?php

namespace App\Result\Overpass;

require_once(__DIR__ . "/../LocalQueryResult.php");
require_once(__DIR__ . "/../JSONQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\JSONQueryResult;
use App\Result\QueryResult;
use Exception;
use InvalidArgumentException;

/**
 * Result of an Overpass query
 */
class OverpassQueryResult extends LocalQueryResult implements JSONQueryResult
{
    public function __construct(bool $success, ?array $result)
    {
        if ($success && !is_array($result)) {
            error_log("OverpassQueryResult::__construct: " . json_encode($result));
            throw new InvalidArgumentException("Overpass query result must be an array");
        }
        parent::__construct($success, $result);
    }

    /**
     * @return array<array>
     */
    public function getElements(): array
    {
        $data = $this->getJSONData();
        if (!isset($data["elements"])) {
            error_log("OverpassQueryResult: " . json_encode($data));
            throw new Exception("Missing element section in Overpass response");
        }
        if (!is_array($data["elements"])) {
            error_log("OverpassQueryResult: " . json_encode($data));
            throw new Exception("Element section in Overpass response is not an array");
        }
        if (empty($data["elements"])) {
            error_log("OverpassQueryResult: No elements found in Overpass response:" . PHP_EOL . json_encode($data));
        }
        foreach ($data["elements"] as $row) {
            if (!is_array($row)) {
                error_log("OverpassQueryResult: " . json_encode($data));
                throw new Exception("Element section in Overpass response contains a bad element");
            }
        }
        return $data["elements"];
    }

    public function getJSONData(): array
    {
        //$ret = $this->getGeoJSONData();
        $ret = $this->getResult();
        if (!is_array($ret)) {
            throw new Exception("Internal: JSON result data is not an array");
        }
        return $ret;
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
