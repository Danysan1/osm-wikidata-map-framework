<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/overpass/OverpassCenterQueryResult.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");

use \App\BoundingBox;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\Overpass\OverpassCenterQueryResult;
use App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * OverpassQL query that retrieves only the centroid and the id of any item in a bounding box which has an etymology.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyCenterOverpassQuery extends BBoxOverpassQuery implements BBoxGeoJSONQuery
{
    /**
     * @var string $query
     */
    private $query;

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
            'out ids center;',
            $endpointURL,
            $nodes,
            $ways,
            $relations
        );
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $res = $this->sendAndRequireResult();
        return new OverpassCenterQueryResult($res->isSuccessful(), $res->getArray());
    }
}
