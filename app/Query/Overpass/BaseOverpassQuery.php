<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\Query\Overpass\OverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use Exception;

/**
 * Base OverpassQL query
 */
class BaseOverpassQuery extends OverpassQuery
{
    /**
     * @var array<string>
     */
    protected array $tags;

    private string $position;

    private string $outputType;

    /**
     * @param array<string> $tags OSM wikidata tags to use
     * @param string $position Position filter for the elements (bbox, center, etc.)
     * @param string $outputType Desired output content ('out ids center;' / 'out body; >; out skel qt;' / ...)
     * @param OverpassConfig $config
     */
    public function __construct(array $tags, string $position, string $outputType, OverpassConfig $config)
    {
        $this->tags = $tags;

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

    /**
     * @return array<string>
     */
    public function getTags(): array
    {
        return $this->tags;
    }

    public function __toString(): string
    {
        return parent::__toString() .
            ", " . json_encode($this->tags) .
            ", " . $this->position .
            ", " . $this->outputType;
    }
}
