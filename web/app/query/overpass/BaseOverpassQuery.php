<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassQuery.php");
require_once(__DIR__ . "/OverpassConfig.php");

use \App\Query\Overpass\OverpassQuery;
use \App\Query\Overpass\OverpassConfig;

/**
 * Base OverpassQL query
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BaseOverpassQuery extends OverpassQuery
{
    /**
     * @var string
     */
    private $tag;

    /**
     * @var string
     */
    private $position;

    /**
     * @var string
     */
    private $outputType;

    /**
     * @param string $tag
     * @param string $position Position filter for each element
     * @param string $outputType 'out ids center;' / 'out body; >; out skel qt;' / ...
     * @param OverpassConfig $config
     */
    public function __construct($tag, $position, $outputType, $config)
    {
        $nodesQuery = $config->shouldFetchNodes() ? "node['$tag']($position);" : "";
        $waysQuery = $config->shouldFetchWays() ? "way['$tag']($position);" : "";
        $relationsQuery = $config->shouldFetchRelations() ? "relation['$tag']($position);" : "";
        parent::__construct(
            "[out:json][timeout:25];
            (
                $nodesQuery
                $waysQuery
                $relationsQuery
            );
            $outputType",
            $config->getEndpoint()
        );
        //error_log("BaseOverpassQuery: " . $this->getQuery());
        $this->tag = $tag;
        $this->position = $position;
        $this->outputType = $outputType;
    }

    public function __toString(): string
    {
        return get_class($this) .
            ", " . $this->tag .
            ", " . $this->position .
            ", " . $this->outputType .
            ", " . $this->getEndpointURL();
    }
}
