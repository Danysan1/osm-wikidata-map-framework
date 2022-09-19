<?php

namespace App;

require_once(__DIR__."/query/wikidata/RelatedEntitiesCheckWikidataQuery.php");
require_once(__DIR__."/query/wikidata/RelatedEntitiesDetailsWikidataQuery.php");

use PDO;
use Exception;
use \App\Query\Wikidata\RelatedEntitiesCheckWikidataQuery;
use \App\Query\Wikidata\RelatedEntitiesDetailsWikidataQuery;

/**
 * @param string $wikidataCodsFilter
 * @param string $relationName
 * @param array<string> $relationProps List of wikidata cods for properties to check
 * @param null|array<string> $instanceOfCods List of Wikidata cods for classes that entities must be instance of
 * @param PDO $dbh
 * @param string $wikidataEndpointURL
 * @return int Total number of loaded entities
 */
function loadWikidataRelatedEntities(
    string $wikidataCodsFilter,
    string $relationName,
    array $relationProps,
    ?array $instanceOfCods,
    PDO $dbh,
    string $wikidataEndpointURL
): int {
    if(!$dbh->query(
            "SELECT EXISTS (
                SELECT FROM pg_tables
                WHERE schemaname = 'oem'
                AND tablename  = 'wikidata_named_after'
            )"
        )->fetchColumn())
        throw new Exception("Temporary tables already deleted, can't load Wikidata related entities");
    
    echo "Loading Wikidata \"$relationName\" entities...".PHP_EOL;

    $wikidataJSONFile = "wikidata_$relationName.tmp.json";
    $total_wd = 0;
    $total_wna = 0;

    $n_todo = $dbh->query(
        "SELECT COUNT(DISTINCT ew_wikidata_cod)
        FROM oem.element_wikidata_cods
        WHERE $wikidataCodsFilter"
    )->fetchColumn();
    assert(is_int($n_todo));
    echo "Counted $n_todo Wikidata codes to check.".PHP_EOL;

    $pageSize = 40000;
    for ($offset = 0; $offset < $n_todo; $offset += $pageSize) {
        $truePageSize = min($pageSize, $n_todo - $offset);
        echo "Checking Wikidata \"$relationName\" data ($truePageSize starting from $offset out of $n_todo)...".PHP_EOL;
        $wikidataCodsResult = $dbh->query(
            "SELECT DISTINCT ew_wikidata_cod
            FROM oem.element_wikidata_cods
            WHERE $wikidataCodsFilter
            ORDER BY ew_wikidata_cod
            LIMIT $pageSize
            OFFSET $offset"
        )->fetchAll();
        $wikidataCods = array_column($wikidataCodsResult, "ew_wikidata_cod");

        $wdCheckQuery = new RelatedEntitiesCheckWikidataQuery($wikidataCods, $relationProps, null, $instanceOfCods, $wikidataEndpointURL);
        try {
            $wikidataCods = $wdCheckQuery->sendAndGetWikidataCods();
        } catch (Exception $e) {
            echo "Check failed. Retrying to fetch...".PHP_EOL;
            $wikidataCods = $wdCheckQuery->sendAndGetWikidataCods();
        }
        $n_wikidata_cods = count($wikidataCods);

        if ($n_wikidata_cods == 0) {
            echo "No elements found to fetch details for.".PHP_EOL;
        } else {
            echo "Fetching details for $n_wikidata_cods elements out of $truePageSize...".PHP_EOL;
            $wdDetailsQuery = new RelatedEntitiesDetailsWikidataQuery($wikidataCods, $relationProps, null, $instanceOfCods, $wikidataEndpointURL);
            try {
                $jsonResult = $wdDetailsQuery->sendAndGetJSONResult()->getJSON();
            } catch (Exception $e) {
                echo "Fetch failed. Retrying to fetch...".PHP_EOL;
                $jsonResult = $wdDetailsQuery->sendAndGetJSONResult()->getJSON();
            }
            @file_put_contents($wikidataJSONFile, $jsonResult);

            echo "Loading Wikidata \"$relationName\" data...".PHP_EOL;
            $sth_wd = $dbh->prepare(
                "INSERT INTO oem.wikidata (wd_wikidata_cod)
                SELECT DISTINCT REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
                FROM json_array_elements((:response::JSON)->'results'->'bindings')
                LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE LEFT(value->'element'->>'value', 31) = 'http://www.wikidata.org/entity/'
                AND wikidata IS NULL
                UNION
                SELECT DISTINCT REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
                FROM json_array_elements((:response::JSON)->'results'->'bindings')
                LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE LEFT(value->'related'->>'value', 31) = 'http://www.wikidata.org/entity/'
                AND wikidata IS NULL"
            );
            $sth_wd->bindValue('response', $jsonResult, PDO::PARAM_LOB);
            $sth_wd->execute();
            $n_wd = $sth_wd->rowCount();

            $sth_wna = $dbh->prepare(
                "INSERT INTO oem.wikidata_named_after (wna_wd_id, wna_named_after_wd_id, wna_from_prop_cod)
                SELECT DISTINCT w1.wd_id, w2.wd_id, REPLACE(value->'prop'->>'value', 'http://www.wikidata.org/prop/', '')
                FROM json_array_elements((:response::JSON)->'results'->'bindings')
                JOIN oem.wikidata AS w1 ON w1.wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
                JOIN oem.wikidata AS w2 ON w2.wd_wikidata_cod = REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE LEFT(value->'related'->>'value', 31) = 'http://www.wikidata.org/entity/'"
            );
            $sth_wna->bindValue('response', $jsonResult, PDO::PARAM_LOB);
            $sth_wna->execute();
            $n_wna = $sth_wna->rowCount();
            echo "Loaded $n_wd Wikidata entities and $n_wna \"$relationName\" relationships.".PHP_EOL;

            $total_wd += $n_wd;
            $total_wna += $n_wna;
        }
    }

    echo "Finished loading $total_wd Wikidata entities and $total_wna \"$relationName\" relationships.".PHP_EOL;
    return $total_wd;
}

function loadWikidataNamedAfterEntities(PDO $dbh, string $wikidataEndpointURL): int
{
    return loadWikidataRelatedEntities(
        "ew_from_wikidata",
        "named_after",
        [ // https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-etymology-data
            "P138", // named after
            "P825", // dedicated to
            "P547", // commemorates
        ],
        null,
        $dbh,
        $wikidataEndpointURL
    );
}

function loadWikidataConsistsOfEntities(PDO $dbh, string $wikidataEndpointURL): int
{
    return loadWikidataRelatedEntities(
        "ew_from_name_etymology OR ew_from_subject",
        "consists_of",
        ["P527"], // has part or parts
        [ // https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-etymology-data
            "Q14073567", // sibling duo
            "Q16979650", // sibling group
            "Q10648343", // duo
            "Q16334295", // group of humans
            "Q219160", // couple
            "Q3046146", // married couple
            "Q1141470", // double act
            "Q14756018", // twins
        ],
        $dbh,
        $wikidataEndpointURL
    );
}
