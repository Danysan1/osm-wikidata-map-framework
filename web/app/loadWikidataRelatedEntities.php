<?php

namespace App;

require_once(__DIR__."/query/wikidata/RelatedEntitiesCheckWikidataQuery.php");
require_once(__DIR__."/query/wikidata/RelatedEntitiesDetailsWikidataQuery.php");

use PDO;
use Exception;
use \App\Query\Wikidata\RelatedEntitiesCheckWikidataQuery;
use \App\Query\Wikidata\RelatedEntitiesDetailsWikidataQuery;

/**
 * Queries a list of Wikidata Q-IDs to check from the DB.
 * For each Wikidata Q-ID fetches from the Wikidata SPARQL API the entities related to that Q-ID's entity.
 * For each relationship found
 *  * inserts both entities in the wikidata table
 *  * gets the elements which are related to the searched entity through an etymology
 *  * inserts a new etymolgy for each element found to the related entity
 * 
 * @param string $wikidataCodsTable Table from which Wikidata Q-IDs for entities to check will be queried
 * @param string $wikidataCodsColumn Column from which Wikidata Q-IDs for entities to check will be taken
 * @param string $wikidataCodsFilter Filters applied when querying Wikidata Q-IDs
 * @param string $insertFields fields of the new etymology to fill
 * @param string $insertValues values for the fields of the new etymology to fill
 * @param string $insertExtraJoins extra joins needed in the inser query
 * @param string $relationName human name for this relationship (without spaces)
 * @param array<string> $relationProps List of wikidata P-IDs for properties to check
 * @param null|array<string> $instanceOfCods Optional list of Wikidata Q-IDs for classes that searched entities must be instance of
 * @param PDO $dbh
 * @param string $wikidataEndpointURL
 * @return int Total number of loaded entities
 */
function loadWikidataRelatedEntities(
    string $wikidataCodsTable,
    string $wikidataCodsColumn,
    string $wikidataCodsFilter,
    string $insertFields,
    string $insertValues,
    string $insertExtraJoins,
    string $relationName,
    array $relationProps,
    ?array $instanceOfCods,
    PDO $dbh,
    string $wikidataEndpointURL
): int {
    if($dbh->query(
            "SELECT EXISTS (
                SELECT FROM pg_tables
                WHERE schemaname = 'oem'
                AND tablename  = 'vm_global_map'
            )"
        )->fetchColumn())
        throw new Exception("DB initalization already completed, can't load Wikidata related entities");
    
    echo "Loading Wikidata \"$relationName\" entities...".PHP_EOL;

    $wikidataJSONFile = "wikidata_$relationName.tmp.json";
    $total_wd = 0;
    $total_wna = 0;

    $todoCountQuery =
        "SELECT COUNT(DISTINCT \"$wikidataCodsColumn\")
        FROM $wikidataCodsTable
        WHERE $wikidataCodsFilter";
    echo "Using TODOs count query:".PHP_EOL.$todoCountQuery;

    $n_todo = $dbh->query($todoCountQuery)->fetchColumn();
    assert(is_int($n_todo));
    echo "Counted $n_todo Wikidata codes to check.".PHP_EOL;

    $wikidataCodsQuery =
        "SELECT DISTINCT \"$wikidataCodsColumn\" AS wikidata_cod
        FROM $wikidataCodsTable
        WHERE $wikidataCodsFilter
        ORDER BY \"$wikidataCodsColumn\"";
    echo "Using Wikidata cods query:".PHP_EOL.$wikidataCodsQuery;
    
    $insertQuery =
        "INSERT INTO oem.etymology ($insertFields)
        SELECT DISTINCT $insertValues
        FROM json_array_elements((:response::JSON)->'results'->'bindings')
        JOIN oem.wikidata AS w1 ON w1.wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
        JOIN oem.wikidata AS w2 ON w2.wd_wikidata_cod = REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
        $insertExtraJoins
        WHERE LEFT(value->'related'->>'value', 31) = 'http://www.wikidata.org/entity/'
        AND $wikidataCodsFilter
        ON CONFLICT (et_el_id, et_wd_id) DO NOTHING";
    echo "Using insert query:".PHP_EOL.$insertQuery;

    $pageSize = 40000;
    for ($offset = 0; $offset < $n_todo; $offset += $pageSize) {
        $truePageSize = min($pageSize, $n_todo - $offset);
        echo "Checking Wikidata \"$relationName\" data ($truePageSize starting from $offset out of $n_todo)...".PHP_EOL;
        $wikidataCodsResult = $dbh->query("$wikidataCodsQuery LIMIT $pageSize OFFSET $offset")->fetchAll();
        $wikidataCods = array_column($wikidataCodsResult, "wikidata_cod");

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
                WHERE LEFT(value->'element'->>'value', 31) = 'http://www.wikidata.org/entity/'
                UNION
                SELECT DISTINCT REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
                FROM json_array_elements((:response::JSON)->'results'->'bindings')
                WHERE LEFT(value->'related'->>'value', 31) = 'http://www.wikidata.org/entity/'
                ON CONFLICT (wd_wikidata_cod) DO NOTHING"
            );
            $sth_wd->bindValue('response', $jsonResult, PDO::PARAM_LOB);
            $sth_wd->execute();
            $n_wd = $sth_wd->rowCount();

            $sth_wna = $dbh->prepare($insertQuery);
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
        "oem.element_wikidata_cods",
        "ew_wikidata_cod",
        "ew_from_wikidata",
        "et_el_id, et_wd_id, et_from_wikidata_wd_id, et_from_wikidata_prop_cod",
        "ew_el_id, w2.wd_id, w1.wd_id, REPLACE(value->'prop'->>'value', 'http://www.wikidata.org/prop/', '')",
        "JOIN oem.element_wikidata_cods ON ew_wikidata_cod = w1.wd_wikidata_cod",
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

function loadWikidataPartsOfEntities(PDO $dbh, string $wikidataEndpointURL): int
{
    return loadWikidataRelatedEntities(
        "oem.etymology JOIN oem.wikidata ON wd_id = et_wd_id",
        "wd_wikidata_cod",
        "et_from_parts_of_wd_id IS NULL",
        "et_el_id, et_wd_id, et_from_el_id, et_from_osm, et_from_wikidata_wd_id, et_from_wikidata_prop_cod, et_recursion_depth, et_from_parts_of_wd_id",
        "et_el_id, w2.wd_id, et_from_el_id, et_from_osm, et_from_wikidata_wd_id, et_from_wikidata_prop_cod, et_recursion_depth, w1.wd_id",
        "JOIN oem.etymology ON et_wd_id = w1.wd_id",
        "has_parts",
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
