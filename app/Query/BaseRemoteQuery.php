<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\BaseQuery;

/**
 * Base abstract implementation of a query object.
 */
abstract class BaseRemoteQuery extends BaseQuery
{
    private $endpointURL;

    public function __construct(string $endpointURL)
    {
        $this->endpointURL = $endpointURL;
    }

    public function getEndpointURL(): string
    {
        return $this->endpointURL;
    }

    public function __toString(): string
    {
        return get_class($this) . ", " . $this->getEndpointURL();
    }
}
