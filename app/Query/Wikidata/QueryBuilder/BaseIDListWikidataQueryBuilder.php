<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

use App\StringSet;

abstract class BaseIDListWikidataQueryBuilder implements IDListWikidataQueryBuilder
{
    protected abstract function createQueryFromValidIDsString(string $wikidataValues, string $language): string;

    function createQuery(StringSet $wikidataIDs, string $language): string
    {
        foreach ($wikidataIDs->toArray() as $wikidataID) {
            if (!preg_match("/^Q[0-9]+$/", $wikidataID)) {
                throw new \Exception("Invalid Wikidata ID: $wikidataID");
            }
        }

        // "en-US" => "en"
        $langMatches = [];
        if (!preg_match('/^(\w+)(-\w+)?$/', $language, $langMatches)) {
            error_log("StringSetXMLWikidataQuery: Invalid language code $language");
            throw new \Exception("Invalid language code");
        }
        $language = $langMatches[1];

        $wikidataValues = implode(' ', array_map(function ($id) {
            return "wd:$id";
        }, $wikidataIDs->toArray()));

        return $this->createQueryFromValidIDsString($wikidataValues, $language);
    }
}