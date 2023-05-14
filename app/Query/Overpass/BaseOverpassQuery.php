<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\Config\Overpass\OverpassConfig;
use App\Query\JSONCurlQuery;
use App\Result\JSONRemoteQueryResult;
use App\Result\QueryResult;
use App\Result\RemoteQueryResult;
use Exception;

/**
 * Base OverpassQL query
 */
class BaseOverpassQuery extends JSONCurlQuery implements OverpassQuery
{
    /**
     * @var array<string>
     */
    private array $keys;

    private string $position;

    private string $outputType;

    private string $query;

    /**
     * @param array<string> $keys OSM wikidata keys to use
     * @param string $position Position filter for the elements (bbox, center, etc.)
     * @param string $outputType Desired output content ('out ids center;' / 'out body; >; out skel qt;' / ...)
     * @param OverpassConfig $config
     */
    public function __construct(array $keys, string $position, string $outputType, OverpassConfig $config)
    {
        $this->keys = $keys;
        $filterTags = $config->getBaseFilterTags();

        $query = "[out:json][timeout:40]; ( ";
        foreach ($this->keys as $key) {
            if (empty($filterTags) || in_array($key, $filterTags) || in_array("$key=*", $filterTags)) {
                // No filter tag configured or condition already satisfied by searching for the given key
                $filterSuffix = "['$key']($position);";
                if ($config->shouldFetchNodes())
                    $query .= "node" . $filterSuffix;
                if ($config->shouldFetchWays())
                    $query .= "way" . $filterSuffix;
                if ($config->shouldFetchRelations())
                    $query .= "relation" . $filterSuffix;
            } else {
                // It's necessary to search for all the filter tags
                foreach ($filterTags as $filterTag) {
                    $filterSuffix = "['$key']($position);";
                    if (!empty($filterTag)) {
                        $split = explode("=", (string)$filterTag);
                        if (empty($split[0]))
                            throw new Exception("Bad filter tags config: '$filterTag'");
                        $quotedFilterTag = "'" . $split[0] . "'";
                        if (!empty($split[1]) && $split[1] != "*")
                            $quotedFilterTag .= "='" . $split[1] . "'";
                        $filterSuffix = "[$quotedFilterTag]$filterSuffix";
                    }

                    if ($config->shouldFetchNodes())
                        $query .= "node" . $filterSuffix;
                    if ($config->shouldFetchWays())
                        $query .= "way" . $filterSuffix;
                    if ($config->shouldFetchRelations())
                        $query .= "relation" . $filterSuffix;
                }
            }
        }
        $query .= " ); $outputType";
        //error_log(get_class($this) . ": $query");

        $endpointURL = $config->getEndpoint();
        parent::__construct(["data" => $query], $endpointURL, "POST");

        $this->query = $query;
        $this->position = $position;
        $this->outputType = $outputType;
    }

    public function getOverpassQlQuery(): string
    {
        return $this->query;
    }

    public function sendAndRequireResult(): QueryResult
    {
        $res = $this->send();
        $endpointUrl = $this->getEndpointURL();
        if (!$res->isSuccessful()) {
            error_log("BaseOverpassQuery from '$endpointUrl' failed: " . get_class($res));
            if (!$res instanceof RemoteQueryResult || !$res->hasBody())
                throw new Exception("Overpass query failed");

            if (strpos($res->getBody(), "Dispatcher_Client::request_read_and_idx::timeout"))
                throw new Exception("Overpass server timeout. Please try later.");

            if (strpos($res->getBody(), "Dispatcher_Client::request_read_and_idx::rate_limited"))
                throw new Exception("Rate limited by Overpass server. Please try later.");
        } elseif (!$res->hasResult()) {
            throw new Exception("Overpass query has no result");
        } elseif (empty($res->getResult())) {
            throw new Exception("Overpass query has empty result");
        } elseif ($res instanceof JSONRemoteQueryResult && !empty($res->getArray()["remark"])) {
            $remark = (string)$res->getArray()["remark"];
            if (strpos($remark, "Query timed out") !== false)
                throw new Exception("Overpass query timed out. Please try with a smaller area.");

            error_log("JSONRemoteQueryResult from '$endpointUrl' has a remark: '$remark'");
        } else {
            //error_log("sendAndRequireResult: result is of type " . gettype($res));
            //if ($res instanceof RemoteQueryResult) error_log("sendAndRequireResult: " . $res->getBody());
        }
        return $res;
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

    public function getQueryTypeCode(): string
    {
        $keysRecap = implode("_", array_map(function ($key) {
            return strstr($key, ":", true);
        }, $this->keys));
        return parent::getQueryTypeCode() . "_" . $keysRecap;
    }
}
