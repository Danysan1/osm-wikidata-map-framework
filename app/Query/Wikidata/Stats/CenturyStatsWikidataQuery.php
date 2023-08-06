<?php

declare(strict_types=1);

namespace App\Query\Wikidata\Stats;

use App\Query\BBoxGeoJSONQuery;
use App\Query\Combined\BBoxJSONOverpassWikidataQuery;
use App\Query\StringSetXMLQueryFactory;
use App\Query\Wikidata\GeoJSON2JSONEtymologyWikidataQuery;
use App\Result\GeoJSONQueryResult;
use App\Result\JSONLocalQueryResult;
use App\Result\JSONQueryResult;
use App\Result\Wikidata\XMLWikidataEtymologyQueryResult;
use App\Result\XMLQueryResult;
use App\ServerTiming;

/**
 * Query which retrieves statistics on the century of some items in an input query result
 */
class CenturyStatsWikidataQuery extends BBoxJSONOverpassWikidataQuery
{
    /** @var string[] $dateFields */
    private array $dateFields;

    /**
     * @param string[] $dateFields The fields in each Wikidata result row which contain the dates
     */
    public function __construct(array $dateFields, BBoxGeoJSONQuery $baseQuery, StringSetXMLQueryFactory $wikidataFactory, ServerTiming $timing)
    {
        parent::__construct($baseQuery, $wikidataFactory, $timing);
        $this->dateFields = $dateFields;
    }

    protected function createResult(GeoJSONQueryResult $overpassResult): JSONQueryResult
    {
        $overpassGeoJSONData = $overpassResult->getGeoJSONData();
        if (!isset($overpassGeoJSONData["features"])) {
            throw new \Exception("Invalid GeoJSON data (no features array)");
        } elseif (empty($overpassGeoJSONData["features"])) {
            error_log("Empty features, returning directly empty result");
            $out = new JSONLocalQueryResult(true, []);
        } else {
            $wikidataQuery = new GeoJSON2JSONCenturyStatsWikidataQuery($this->dateFields, $overpassGeoJSONData, $this->wikidataFactory);
            $out = $wikidataQuery->sendAndGetJSONResult();
        }
        return $out;
    }
}

class GeoJSON2JSONCenturyStatsWikidataQuery extends GeoJSON2JSONEtymologyWikidataQuery
{
    /** @var string[] $dateFields */
    private array $dateFields;

    /**
     * @param string[] $dateFields The fields in each Wikidata result row which contain the dates
     */
    public function __construct(array $dateFields, array $geoJSONData, StringSetXMLQueryFactory $queryFactory)
    {
        parent::__construct($geoJSONData, $queryFactory);
        $this->dateFields = $dateFields;
    }

    protected function createQueryResult(XMLQueryResult $wikidataResult): JSONQueryResult
    {
        $wikidataResponse = XMLWikidataEtymologyQueryResult::fromXMLResult($wikidataResult);
        $matrixData = $wikidataResponse->getMatrixData();
        $fieldCount = count($this->dateFields);
        $centuryCounts = [];
        foreach ($matrixData as $rowIndex => $row) {
            $foundCenturyForRow = false;
            for ($fieldIndex = 0; !$foundCenturyForRow && $fieldIndex < $fieldCount; $fieldIndex++) {
                $dateField = $this->dateFields[$fieldIndex];
                if (empty($row[$dateField])) {
                    //error_log("Empty date field '$dateField' for row $rowIndex");
                } else {
                    $isoDate = (string)($row[$dateField]);
                    $matches = [];
                    $matchCount = preg_match("/^(-?\d+)-.+$/", $isoDate, $matches);
                    if ($matchCount !== false && !empty($matches[1])) {
                        $year = (int)$matches[1];
                        $century = (int)ceil($year / 100);
                        if (empty($centuryCounts[$century]))
                            $centuryCounts[$century] = 1;
                        else
                            $centuryCounts[$century]++;
                        //error_log("Date elaboration for row $rowIndex: $isoDate => $year => $century");
                        $foundCenturyForRow = true;
                    }
                }
            }
        }
        krsort($centuryCounts);
        $stats = [];
        foreach ($centuryCounts as $century => $count) {
            $stats[] = [
                "id" => $century,
                "name" => (string)$century,
                "count" => $count,
                "color" => BBoxJSONOverpassWikidataQuery::getCenturyColor($century)
            ];
        }
        return new JSONLocalQueryResult(true, $stats);
    }
}
