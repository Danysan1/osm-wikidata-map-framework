<?php

declare(strict_types=1);

namespace App\Config\Overpass;


use \App\Config\Configuration;
use Exception;

class RoundRobinOverpassConfig implements OverpassConfig
{
    private array $endpoints;
    private bool $fetchNodes;
    private bool $fetchWays;
    private bool $fetchRelations;
    private ?int $maxElements;
    private ?array $baseFilterTags;

    /**
     * @param Configuration $conf
     * @param null|array<string> $overrideEndpoints
     */
    public function __construct(Configuration $conf, ?array $overrideEndpoints = null)
    {
        if (empty($overrideEndpoints)) {
            $this->endpoints = $conf->getArray('overpass_endpoints');
        } else {
            $this->endpoints = $overrideEndpoints;
        }

        $this->fetchNodes = $conf->getBool("fetch_nodes");
        $this->fetchWays = $conf->getBool("fetch_ways");
        $this->fetchRelations = $conf->getBool("fetch_relations");
        if (!$this->fetchNodes && !$this->fetchWays && !$this->fetchRelations) {
            throw new Exception("All fetching options (fetch_nodes, fetch_ways, fetch_relations) are false");
        }

        $maxElements = $conf->has("max_map_elements") ? (int)$conf->get("max_map_elements") : null;
        if ($maxElements !== null && $maxElements <= 0) {
            throw new Exception("The max_map_elements configuration must be > 0 or empty");
        }
        $this->maxElements = $maxElements;

        $this->baseFilterTags = $conf->has("osm_filter_tags") ? $conf->getArray("osm_filter_tags") : null;
    }

    public function getEndpoint(): string
    {
        $out = $this->endpoints[array_rand($this->endpoints)];
        //error_log("RoundRobinOverpassConfig: $out");
        return $out;
    }

    public function shouldFetchNodes(): bool
    {
        return $this->fetchNodes;
    }

    public function shouldFetchWays(): bool
    {
        return $this->fetchWays;
    }

    public function shouldFetchRelations(): bool
    {
        return $this->fetchRelations;
    }

    public function getMaxElements(): ?int
    {
        return $this->maxElements;
    }

    public function getBaseFilterTags(): ?array
    {
        return $this->baseFilterTags;
    }
}
