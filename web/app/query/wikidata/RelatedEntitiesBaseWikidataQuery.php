<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/JSONWikidataQuery.php");

use App\Query\Wikidata\JSONWikidataQuery;
use InvalidArgumentException;

abstract class RelatedEntitiesBaseWikidataQuery extends JSONWikidataQuery
{
    /**
     * @param array<string> $array ["A", "B", "C]
     * @param string $prefix "x"
     * @return string "x:A x:B x:C"
     */
    protected static function arrayToPrefixedString(array $array, string $prefix): string
    {
        $prefixedArray = array_map(function ($element) use ($prefix) {
            return "$prefix:$element";
        }, $array);
        $prefixedString = implode(" ", $prefixedArray);

        return $prefixedString;
    }

    /**
     * @param array<string> $wikidataCods ["Q1", "Q2", "Q3]
     * @return string "wd:Q1 wd:Q2 wd:Q3"
     */
    protected static function getWikidataCodsToCheck(array $wikidataCods): string
    {
        if (empty($wikidataCods))
            throw new InvalidArgumentException("Empty wikidata codes array");

        return self::arrayToPrefixedString($wikidataCods, "wd");
    }

    /**
     * @param array<string> $props ["P1", "P2", "P3"]
     * @return string "p:P1 p:P2 p:P3"
     */
    protected static function getPropsToCheck(array $props): string
    {
        if (empty($props))
            throw new InvalidArgumentException("Empty wikidata props array");

        return self::arrayToPrefixedString($props, "p");
    }

    /**
     * @param array<string> $props ["P1", "P2", "P3"]
     * @return string "wdt:P1 wdt:P2 wdt:P3"
     */
    protected static function getDirectPropsToCheck(array $props): string
    {
        if (empty($props))
            throw new InvalidArgumentException("Empty wikidata props array");

        return self::arrayToPrefixedString($props, "wdt");
    }

    /**
     * @param array<string> $props ["P1", "P2", "P3]
     * @return string "ps:P1 ps:P2 ps:P3"
     */
    protected static function getPropStatementsToCheck(array $props): string
    {
        if (empty($props))
            throw new InvalidArgumentException("Empty wikidata props array");

        return self::arrayToPrefixedString($props, "ps");
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
            $okClasses = self::getWikidataCodsToCheck($instanceOfCods);
            $fullInstanceOfFilter = "VALUES ?okClass { $okClasses }. \n ?element wdt:P31 ?okClass.";
        }

        return $fullInstanceOfFilter;
    }
}
