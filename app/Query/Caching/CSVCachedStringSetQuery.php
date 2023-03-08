<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\Query\Caching\CSVCachedQuery;
use \App\Query\StringSetQuery;
use \App\Query\Caching\CachedStringSetQuery;
use \App\BaseStringSet;
use \App\Result\QueryResult;
use \App\StringSet;

/**
 * A query which searches objects in a given string set caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class CSVCachedStringSetQuery extends CSVCachedQuery implements CachedStringSetQuery
{
    public const STRING_SET_CACHE_COLUMN_TIMESTAMP = 0;
    public const STRING_SET_CACHE_COLUMN_SITE = 1;
    public const STRING_SET_CACHE_COLUMN_STRING_SET = 2;
    public const STRING_SET_CACHE_COLUMN_RESULT = 3;

    public function getStringSet(): StringSet
    {
        $baseQuery = $this->getBaseQuery();
        if (!$baseQuery instanceof StringSetQuery) {
            throw new \Exception("Bad base query");
        }
        return $baseQuery->getStringSet();
    }

    protected function shouldTrashRow(array $row): bool
    {
        return $this->getStringSet()->strictlyContains($this->getStringSetFromRow($row));
    }

    protected function shouldKeepRow(array $row): bool
    {
        return $this->baseShouldKeepRow(
            $row,
            self::STRING_SET_CACHE_COLUMN_TIMESTAMP,
            self::STRING_SET_CACHE_COLUMN_SITE,
            self::STRING_SET_CACHE_COLUMN_RESULT
        );
    }

    protected abstract function getResultFromFile(string $relativePath): QueryResult;

    protected function getResultFromRow(array $row): ?QueryResult
    {
        $rowSite = (string)$row[self::STRING_SET_CACHE_COLUMN_SITE];
        $okSite = empty($_SERVER["SERVER_NAME"]) || $rowSite == $_SERVER["SERVER_NAME"];

        $rowStringSet = $this->getStringSetFromRow($row);
        if ($okSite && $rowStringSet->containsOrEquals($this->getStringSet())) {
            // Row string set contains entirely the query string set, cache hit!
            $contentFileRelativePath = (string)$row[self::STRING_SET_CACHE_COLUMN_RESULT];
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
            self::STRING_SET_CACHE_COLUMN_TIMESTAMP => time(),
            self::STRING_SET_CACHE_COLUMN_SITE => empty($_SERVER["SERVER_NAME"]) ? "" : $_SERVER["SERVER_NAME"],
            self::STRING_SET_CACHE_COLUMN_STRING_SET => $this->getStringSet()->toJson(),
            self::STRING_SET_CACHE_COLUMN_RESULT => $contentFileRelativePath
        ];
        return $newRow;
    }

    private function getStringSetFromRow(array $row): StringSet
    {
        return BaseStringSet::fromJSON((string)$row[self::STRING_SET_CACHE_COLUMN_STRING_SET]);
    }
}
