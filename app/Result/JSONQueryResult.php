<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\QueryResult;

/**
 * Query result whose content can be converted to JSON data.
 */
interface JSONQueryResult extends QueryResult
{
    /**
     * @return array
     */
    public function getJSONData(): array;

    /**
     * @return string
     */
    public function getJSON(): string;
}
