<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\Query\Caching\CSVCachedQuery;
use \App\Query\StringSetQuery;
use \App\Query\Caching\CachedStringSetQuery;
use \App\BaseStringSet;
use \App\Result\QueryResult;
use \App\StringSet;
use \App\ServerTiming;
use \App\Config\Configuration;

define("STRING_SET_CACHE_COLUMN_TIMESTAMP", 0);
define("STRING_SET_CACHE_COLUMN_SET", 1);
define("STRING_SET_CACHE_COLUMN_RESULT", 2);

/**
 * A query which searches objects in a given string set caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class CSVCachedStringSetQuery extends CSVCachedQuery implements CachedStringSetQuery
{
    public function getStringSet(): StringSet
    {
        $baseQuery = $this->getBaseQuery();
        if (!$baseQuery instanceof StringSetQuery) {
            throw new \Exception("Bad base query");
        }
        return $baseQuery->getStringSet();
    }

    protected function shouldKeepRow(array $row): bool
    {
        $newStringSet = $this->getStringSet();
        return $this->baseShouldKeepRow(
            $row,
            STRING_SET_CACHE_COLUMN_TIMESTAMP,
            STRING_SET_CACHE_COLUMN_RESULT,
            [$this, "getStringSetFromRow"],
            [$newStringSet, "strictlyContains"]
        );
    }

    protected abstract function getResultFromFile(string $relativePath): QueryResult;

    /**
     * @return QueryResult|null
     */
    protected function getResultFromRow(array $row)
    {
        $rowStringSet = $this->getStringSetFromRow($row);
        if ($rowStringSet->containsOrEquals($this->getStringSet())) {
            // Row string set contains entirely the query string set, cache hit!
            $contentFileRelativePath = (string)$row[STRING_SET_CACHE_COLUMN_RESULT];
            $result = $this->getResultFromFile($contentFileRelativePath);
            //error_log(get_class($this).": " . $rowStringSet . " contains " . $this->getStringSet());
        } else {
            $result = null;
        }
        return $result;
    }

    protected abstract function createFileFromResult(QueryResult $result): string;

    protected function getRowFromResult(QueryResult $result): array
    {
        $contentFileRelativePath = $this->createFileFromResult($result);

        $newRow = [
            STRING_SET_CACHE_COLUMN_TIMESTAMP => time(),
            STRING_SET_CACHE_COLUMN_SET => $this->getStringSet()->toJson(),
            STRING_SET_CACHE_COLUMN_RESULT => $contentFileRelativePath
        ];
        return $newRow;
    }

    public function getStringSetFromRow(array $row): StringSet
    {
        return BaseStringSet::fromJSON((string)$row[STRING_SET_CACHE_COLUMN_SET]);
    }
}
