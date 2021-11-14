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
     * @var array<string>
     */
    protected $tags;

    /**
     * @var string
     */
    private $position;

    /**
     * @var string
     */
    private $outputType;

    /**
     * @param string|array<string> $tags Tags to search
     * @param string $position Position filter for the elements (bbox, center, etc.)
     * @param string $outputType Desired output content ('out ids center;' / 'out body; >; out skel qt;' / ...)
     * @param OverpassConfig $config
     */
    public function __construct($tags, string $position, string $outputType, OverpassConfig $config)
    {
        $this->tags = is_string($tags) ? [$tags] : $tags;

        $query = "[out:json][timeout:40]; ( ";
        foreach ($this->tags as $tag) {
            if ($config->shouldFetchNodes())
                $query .= "node['name']['$tag']($position);";
            if ($config->shouldFetchWays())
                $query .= "way['name']['$tag']($position);";
            if ($config->shouldFetchRelations())
                $query .= "relation['name']['$tag']($position);";
        }
        $query .= " ); $outputType";
        //error_log(get_class($this) . ": $query");

        parent::__construct($query, $config->getEndpoint());

        $this->position = $position;
        $this->outputType = $outputType;
    }

    public function __toString(): string
    {
        return parent::__toString() .
            ", " . json_encode($this->tags) .
            ", " . $this->position .
            ", " . $this->outputType;
    }
}
