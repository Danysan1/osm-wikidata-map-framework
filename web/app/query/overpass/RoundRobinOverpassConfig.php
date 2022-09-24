<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassConfig.php");

use App\Configuration;
use \App\Query\Overpass\OverpassConfig;
use Exception;

class RoundRobinOverpassConfig implements OverpassConfig
{
    /**
     * @var array<string>
     */
    private $endpoints;
    /**
     * @var bool
     */
    private $nodes;
    /**
     * @var bool
     */
    private $ways;
    /**
     * @var bool
     */
    private $relations;
    /**
     * @var int|null
     */
    private $maxElements;

    /**
     * @param Configuration $conf
     * @param null|array<string> $overrideEndpoints
     */
    public function __construct(Configuration $conf, ?array $overrideEndpoints = null)
    {
        $this->endpoints = empty($overrideEndpoints) ? (array)json_decode((string)($conf->get('overpass_endpoints'))) : $overrideEndpoints;

        $this->nodes = $conf->getBool("fetch_nodes");
        $this->ways = $conf->getBool("fetch_ways");
        $this->relations = $conf->getBool("fetch_relations");
        if (!$this->nodes && !$this->ways && !$this->relations) {
            throw new \Exception("No fetching options set");
        }

        $maxElements = $conf->has("max_elements") ? (int)$conf->get("max_elements") : null;
        if ($maxElements !== null && $maxElements <= 0) {
            throw new Exception("maxElements must be > 0");
        }
        $this->maxElements = $maxElements;
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

    public function getMaxElements(): int|null
    {
        return $this->maxElements;
    }
}
