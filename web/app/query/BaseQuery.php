<?php

namespace App\Query;

require_once(__DIR__ . "/Query.php");
require_once(__DIR__ . "/../result/QueryResult.php");

use \App\Query\Query;
use \App\Result\QueryResult;

/**
 * Base abstract implementation of a query object.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class BaseQuery implements Query
{
    /**
     * @var string $query
     */
    private $query;

    /**
     * @var string $endpointURL
     */
    private $endpointURL;

    /**
     * @param string $query
     * @param string $endpointURL
     */
    public function __construct(string $query, string $endpointURL)
    {
        $this->query = $query;
        $this->endpointURL = $endpointURL;
    }

    /**
     * @return string
     */
    public function getQuery(): string
    {
        return $this->query;
    }

    /**
     * @return string
     */
    public function getEndpointURL(): string
    {
        return $this->endpointURL;
    }

    /**
     * @return QueryResult
     */
    public abstract function send(): QueryResult;

    public function __toString(): string
    {
        return get_class($this) . ", " . $this->getEndpointURL();
    }
}
