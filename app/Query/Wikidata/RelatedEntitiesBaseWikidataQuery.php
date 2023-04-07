<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\Wikidata\JSONWikidataQuery;
use InvalidArgumentException;

abstract class RelatedEntitiesBaseWikidataQuery extends JSONWikidataQuery
{
    /**
     * @param array<string> $array ["A", "B", "C]
     * @param string $prefix "x"
     * @param bool $inverse If true, the property logic is reversed (eg. "P1" becomes "^wdt:P1" instead of "wdt:P1")
     * @return string "x:A x:B x:C"
     */
    protected static function arrayToPrefixedString(array $array, string $prefix, bool $inverse = false): string
    {
        if (empty($array))
            throw new InvalidArgumentException("Empty input Wikidata ID array");

        $prefixedArray = array_map(function ($element) use ($prefix, $inverse) {
            return ($inverse ? "^" : "") . "$prefix:$element";
        }, $array);
        $prefixedString = implode(" ", $prefixedArray);

        return $prefixedString;
    }

    /**
     * @param string|null $elementFilter "wdt:P31 wd:Q14073567"
     * @return string "?element wdt:P31 wd:Q14073567."
     */
    protected static function getFullElementFilter(?string $elementFilter): string
    {
        if (empty($elementFilter))
            $fullElementFilter = '';
        else
            $fullElementFilter = "?element $elementFilter.";

        return $fullElementFilter;
    }

    /**
     * @param null|array<string> $instanceOfCods ["Q14073567", "Q14073568"]
     * @return string "VALUES ?okClass { wd:Q14073567 wd:Q14073568 }. ?element wdt:P31 ?okClass."
     */
    protected static function getFullInstanceOfFilter(?array $instanceOfCods): string
    {
        if (empty($instanceOfCods)) {
            $fullInstanceOfFilter = '';
        } else {
            $okClasses = self::arrayToPrefixedString($instanceOfCods, "wd");
            $fullInstanceOfFilter = "VALUES ?okClass { $okClasses }. \n ?element wdt:P31 ?okClass.";
        }

        return $fullInstanceOfFilter;
    }
}
