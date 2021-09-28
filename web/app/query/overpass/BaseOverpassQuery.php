<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassQuery.php");

use \App\Query\Overpass\OverpassQuery;

/**
 * Base OverpassQL query
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BaseOverpassQuery extends OverpassQuery
{
    /**
     * @param string $tag
     * @param string $position Position filter for each element
     * @param string $outputType 'out ids center;' / 'out body; >; out skel qt;' / ...
     * @param string $endpointURL
     * @param boolean $nodes
     * @param boolean $ways
     * @param boolean $relations
     */
    public function __construct($tag, $position, $outputType, $endpointURL, $nodes, $ways, $relations)
    {
        $nodesQuery = $nodes ? "node['$tag']($position);" : "";
        $waysQuery = $ways ? "way['$tag']($position);" : "";
        $relationsQuery = $relations ? "relation['$tag']($position);" : "";
        parent::__construct(
            "[out:json][timeout:25];
            (
                $nodesQuery
                $waysQuery
                $relationsQuery
            );
            $outputType",
            $endpointURL
        );
        //error_log("BaseOverpassQuery: " . $this->getQuery());
    }
}
