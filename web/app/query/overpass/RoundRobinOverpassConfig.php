<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassConfig.php");

use App\Configuration;
use \App\Query\Overpass\OverpassConfig;

class RoundRobinOverpassConfig implements OverpassConfig
{
    private $endpoints;
    private $nodes;
    private $ways;
    private $relations;

    public function __construct(Configuration $conf)
    {
        $this->endpoints = (array)$conf->get('overpass-endpoints');
        $this->nodes = $conf->has("fetch-nodes") && (bool)$conf->get("fetch-nodes");
        $this->ways = $conf->has("fetch-ways") && (bool)$conf->get("fetch-ways");
        $this->relations = $conf->has("fetch-relations") && (bool)$conf->get("fetch-relations");
        if(!$this->nodes && !$this->ways && !$this->relations) {
            throw new \Exception("No fetching options set");
        }
    }

    public function getEndpoint(): string
    {
        $out = $this->endpoints[array_rand($this->endpoints)];
        //error_log("RoundRobinOverpassConfig: $out");
        return $out;
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
