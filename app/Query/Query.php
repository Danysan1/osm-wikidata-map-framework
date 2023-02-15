<?php

declare(strict_types=1);

namespace App\Query;


use \App\Result\QueryResult;

/**
 * A query is a request for data from a local or remote data source.
 */
interface Query {
    public function getQuery(): string;

    public function send(): QueryResult;

    public function getQueryTypeCode(): string;

    public function __toString(): string;
}