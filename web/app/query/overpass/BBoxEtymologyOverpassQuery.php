<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/overpass/OverpassEtymologyQueryResult.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");

use \App\BoundingBox;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\QueryResult;

/**
 * OverpassQL query that retrieves all the details of any item in a bounding box which has an etymology.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyOverpassQuery extends BBoxOverpassQuery implements BBoxGeoJSONQuery
{
    /**
     * @param BoundingBox $bbox
     * @param string $endpointURL
     */
    public function __construct($bbox, $endpointURL)
    {
        $bboxString = $bbox->asBBoxString();
        parent::__construct(
            $bbox,
            "[out:json][timeout:25];
            (
                //node['name:etymology:wikidata']($bboxString);
                way['name:etymology:wikidata']($bboxString);
                //relation['name:etymology:wikidata']($bboxString);
            );
            out body;
            >;
            out skel qt;",
            $endpointURL
        );
    }

    /**
     * @return \App\Result\GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $res = parent::send();
        if (!$res->isSuccessful() || !$res->hasResult()) {
            error_log("BBoxEtymologyOverpassQuery: Overpass query failed: $res");
            throw new \Exception("Overpass query failed");
        }
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getArray());
    }
}
