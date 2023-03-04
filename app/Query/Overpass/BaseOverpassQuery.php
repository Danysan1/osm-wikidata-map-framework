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
    private array $keys;

    private string $position;

    private string $outputType;

    /**
     * @param array<string> $keys OSM wikidata keys to use
     * @param string $position Position filter for the elements (bbox, center, etc.)
     * @param string $outputType Desired output content ('out ids center;' / 'out body; >; out skel qt;' / ...)
     * @param OverpassConfig $config
     */
    public function __construct(array $keys, string $position, string $outputType, OverpassConfig $config)
    {
        $this->keys = $keys;
        $filterKey = $config->getBaseFilterKey();

        $query = "[out:json][timeout:40]; ( ";
        foreach ($this->keys as $key) {
            if ($config->shouldFetchNodes())
                $query .= "node['$filterKey']['$key']($position);";
            if ($config->shouldFetchWays())
                $query .= "way['$filterKey']['$key']($position);";
            if ($config->shouldFetchRelations())
                $query .= "relation['$filterKey']['$key']($position);";
        }
        $query .= " ); $outputType";
        //error_log(get_class($this) . ": $query");

        parent::__construct($query, $config->getEndpoint());

        $this->position = $position;
        $this->outputType = $outputType;
    }

    /**
     * @return array<string> OSM wikidata keys to use
     */
    public function getKeys(): array
    {
        return $this->keys;
    }

    public function __toString(): string
    {
        return parent::__toString() .
            ", " . json_encode($this->keys) .
            ", " . $this->position .
            ", " . $this->outputType;
    }
}
