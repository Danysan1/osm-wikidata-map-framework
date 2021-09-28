<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassConfig.php");

use App\Configuration;
use \App\Query\Overpass\OverpassConfig;

class FixedEndpointOverpassConfig implements OverpassConfig
{
    private $endpoint;
    private $nodes;
    private $ways;
    private $relations;

    public function __construct(Configuration $conf)
    {
        $this->endpoint = (string)$conf->get('overpass-endpoint');
        $this->nodes = $conf->has("fetch-nodes") && (bool)$conf->get("fetch-nodes");
        $this->ways = $conf->has("fetch-ways") && (bool)$conf->get("fetch-ways");
        $this->relations = $conf->has("fetch-relations") && (bool)$conf->get("fetch-relations");
    }

    public function getEndpoint(): string
    {
        return $this->endpoint;
    }

    public function shouldFetchNodes(): bool
    {
        return $this->nodes;
    }

    public function shouldFetchWays(): bool
    {
        return $this->ways;
    }

    public function shouldFetchRelations(): bool
    {
        return $this->relations;
    }
}