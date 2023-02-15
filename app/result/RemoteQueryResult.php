<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\QueryResult;

/**
 * Result of a remote query
 */
interface RemoteQueryResult extends QueryResult {
    /**
     * @return boolean
     */
    public function hasBody();

    /**
     * @return string
     */
    public function getBody();

    /**
     * @return int
     */
    public function getHttpCode();

    /**
     * @return string
     */
    public function getMimeType();
}