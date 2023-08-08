<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

use App\BaseStringSet;
use App\StringSet;
use Exception;

abstract class BaseIDListWikidataQueryBuilder implements IDListWikidataQueryBuilder
{
    protected abstract function createQueryFromValidIDsString(string $wikidataValues, string $language): string;

    function createQuery(StringSet $wikidataIDs, string $language, int $maxSize): string
    {
        $size = $wikidataIDs->count();
        if ($size === 0) {
            throw new Exception("StringSetJSONWikidataQuery: The given ID list is empty");
        }

        if ($maxSize && $size > $maxSize) {
            error_log("StringSetJSONWikidataQuery: The given ID list is too big ($size > $maxSize)");
            $wikidataIDs = new BaseStringSet(array_slice($wikidataIDs->toArray(), 0, $maxSize));
            $size = $maxSize;
        }

        foreach ($wikidataIDs->toArray() as $wikidataID) {
            if (!preg_match("/^Q[0-9]+$/", $wikidataID)) {
                throw new \Exception("Invalid Wikidata ID: $wikidataID");
            }
        }

        $wikidataValues = implode(' ', array_map(function ($id) {
            return "wd:$id";
        }, $wikidataIDs->toArray()));

        //error_log("BaseIDListWikidataQueryBuilder: building from $size IDs");
        return $this->createQueryFromValidIDsString($wikidataValues, $language);
    }
}
