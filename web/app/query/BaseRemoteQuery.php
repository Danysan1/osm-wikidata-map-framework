<?php

namespace App\Query;

require_once(__DIR__ . "/BaseQuery.php");

use \App\Query\BaseQuery;

/**
 * Base abstract implementation of a query object.
 */
abstract class BaseRemoteQuery extends BaseQuery
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

    public function __toString(): string
    {
        return get_class($this) . ", " . $this->getEndpointURL();
    }
}
