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
     * @param boolean $nodes
     * @param boolean $ways
     * @param boolean $relations
     */
    public function __construct($bbox, $endpointURL, $nodes, $ways, $relations)
    {
        parent::__construct(
            'name:etymology:wikidata',
            $bbox,
            'out body; >; out skel qt;',
            $endpointURL,
            $nodes,
            $ways,
            $relations
        );
    }

    /**
     * @return \App\Result\GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $res = $this->sendAndRequireResult();
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getArray());
    }
}
