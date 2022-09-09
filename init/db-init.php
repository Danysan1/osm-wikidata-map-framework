<?php

if (php_sapi_name() != "cli") {
    http_response_code(400);
    die("Only runnable through CLI");
}

// This allows running the script directly or inside docker 
$webFolder = __DIR__ . "/../" . (file_exists(__DIR__ . "/../web") ? "web" : "html");

require_once("$webFolder/app/IniEnvConfiguration.php");
require_once("$webFolder/app/PostGIS_PDO.php");
require_once("$webFolder/app/query/wikidata/RelatedEntitiesCheckWikidataQuery.php");
require_once("$webFolder/app/query/wikidata/RelatedEntitiesDetailsWikidataQuery.php");

use App\IniEnvConfiguration;
use App\PostGIS_PDO;
use \App\Query\Wikidata\RelatedEntitiesCheckWikidataQuery;
use \App\Query\Wikidata\RelatedEntitiesDetailsWikidataQuery;

$fileArgumentIndex = false;
$options = getopt(
    "hkcrptn",
    [
        "help",
        "keep-temp-tables",
        "cleanup",
        "reset",
        "propagate",
        "load-text-etymology",
        "no-upload",
        "osmium-export",
        "osm2pgsql"
    ],
    $fileArgumentIndex
);

$conf = new IniEnvConfiguration();
if (!empty($argv[$fileArgumentIndex])) {
    $fileArgument = (string)$argv[$fileArgumentIndex];
    if (str_starts_with($fileArgument, './init/pbf/') || str_starts_with($fileArgument, '.\\init\\pbf\\')) {
        $fileArgument = substr($fileArgument, 11);
    }
} elseif($conf->has("db_init_source_url")) {
    $fileArgument = (string)$conf->get("db_init_source_url");
} else {
    echo "ERROR: You must pass as first non-option argument the name or URL of the .osm.pbf input extract" . PHP_EOL;
    exit(1);
}

if (isset($options["help"]) || isset($options["h"])) {
    echo
    "Usage: php db-init.php [OPTIONS] SOURCE_FILE.osm.pbf" . PHP_EOL .
        "\tSOURCE_FILE: a .pbf file in web/" . PHP_EOL .
        "\tOPTIONS: an optional combination of one or more of these flags:" . PHP_EOL .
        "\t\t--keep-temp-tables / -k : Don't delete temporary tables after elaborating (temporary tables are deleted by default)" . PHP_EOL .
        "\t\t--cleanup / -c : Delete temporary files before elaborating (disabled by default)" . PHP_EOL .
        "\t\t--reset / -r : Do a hard reset (delete all tables) before elaborating (disabled by default)" . PHP_EOL .
        "\t\t--propagate / -p : Propagate etymologies to nearby homonymous highways (disabled by default, it increases the execution time)" . PHP_EOL .
        "\t\t--load-text-etymology / -t : Load textual etymologies (name:etymology tags) (disabled by default as it increases by a lot the execution time and file size)" . PHP_EOL .
        "\t\t--no-upload / -n : Don't upload the data to the destination DB (data is uploaded by default)" . PHP_EOL .
        "\t\t--osmium-export : Use osmium-export to load the data into the local DB (enableb by default)" . PHP_EOL .
        "\t\t--osm2pgsql : Use osmpggsql to load the data into the local DB" . PHP_EOL;
    exit(0);
}

define("MAX_RECURSION_DEPTH", 10);

$output = [];
$retval = null;
$keep_temp_tables = isset($options["keep-temp-tables"]) || isset($options["k"]);
$cleanup = isset($options["cleanup"]) || isset($options["c"]);
$reset = isset($options["hard-reset"]) || isset($options["r"]);
$propagate = isset($options["propagate"]) || isset($options["p"]);
$load_text_etymology = isset($options["load-text-etymology"]) || isset($options["t"]);
$no_upload = isset($options["no-upload"]) || isset($options["n"]);
$use_osmium_export = isset($options["osmium-export"]);
$use_osm2pgsql = isset($options["osm2pgsql"]);

$enable_upload = $conf->getBool("db_init_enable_upload");
$upload_to_db = $enable_upload && !$no_upload;

exec("which osmium", $output, $retval);
if ($retval !== 0) {
    echo "ERROR: osmium is not installed" . PHP_EOL;
    exit(1);
}

exec("osmium --version | egrep '^osmium version' | cut -d ' ' -f 3", $output, $retval);
if ($retval !== 0 || empty($output)) {
    echo 'Could not determine osmium version';
    exit(1);
} elseif (preg_match('/^1\.\d$/', (string)$output[0]) === 1) {
    echo 'ERROR: osmium 1.10 or above is required, the available version is: ' . (string)$output[0];
    exit(1);
}

echo 'Temporary tables will ' . ($keep_temp_tables ? '' : 'NOT ') . 'be kept' . PHP_EOL;

echo 'Temporary files will ' . ($cleanup ? '' : 'NOT ') . 'be cleaned up' . PHP_EOL;

echo 'The database content will ' . ($reset ? '' : 'NOT ') . 'be resetted before loading' . PHP_EOL;

echo 'Etymologies will ' . ($propagate ? '' : 'NOT ') . 'be propagated to nearby homonymous highways' . PHP_EOL;

echo 'Textual etymologies (name:etymology tags) will ' . ($load_text_etymology ? '' : 'NOT ') . 'be loaded' . PHP_EOL;

echo 'Elaborated etymologies will ' . ($upload_to_db ? '' : 'NOT ') . 'be loaded into the destination DB' . PHP_EOL;

if ($use_osmium_export) {
    echo 'Using osmium-export to PostGIS tsv' . PHP_EOL;
} elseif ($use_osm2pgsql) {
    echo 'Using osm2pgsql' . PHP_EOL;
    exec("which osm2pgsql", $output, $retval);
    if ($retval !== 0) {
        echo "ERROR: osm2pgsql is not installed" . PHP_EOL;
        exit(1);
    }
} else {
    echo 'Using osmium-export to PostGIS tsv (default)' . PHP_EOL;
    $use_osmium_export = TRUE;
}

if (filter_var($fileArgument, FILTER_VALIDATE_URL) !== false) {
    // $fileArgument is an URL
    // Example: php db-init.php http://download.geofabrik.de/europe/italy/isole-latest.osm.pbf
    $url = $fileArgument;
    $fileName = basename(strtok($url,"?"));
    if(!str_ends_with($fileName, ".osm.pbf")) {
        echo "ERROR: You must pass as first argument the name or URL of the .osm.pbf input extract" . PHP_EOL;
        exit(1);
    }
    $sourceFilePath = __DIR__ . "/pbf/" . $fileName;
    logProgress("Downloading $fileName");
    execAndCheck("curl -z $sourceFilePath -o $sourceFilePath $url");
    logProgress("Download completed");
} elseif (!empty(realpath(__DIR__ . "/pbf/" . $fileArgument))) {
    // $fileArgument is a relative path from the folder of db-init
    // Example: php db-init.php isole-latest.osm.pbf
    $sourceFilePath = realpath(__DIR__ . "/pbf/" . $fileArgument);
} elseif (!empty(realpath($fileArgument))) {
    // $fileArgument is an absolute path
    // Example: php db-init.php /tmp/isole-latest.osm.pbf
    $sourceFilePath = realpath($fileArgument);
} else {
    echo "ERROR: Could not deduce full path for the given file: " . $fileArgument . PHP_EOL;
    exit(1);
}

if (!is_file($sourceFilePath)) {
    echo "ERROR: The file you passed as first argument does not exist: " . $sourceFilePath . PHP_EOL;
    exit(1);
}

//file_put_contents("db-init.log", '');
function logProgress(string $message): void
{
    $msg = "||\t$message" . PHP_EOL;
    echo $msg;
    //file_put_contents("db-init.log", $msg, FILE_APPEND);
}

$workDir = dirname($sourceFilePath);
$sourceFileName = basename($sourceFilePath);
if(!str_ends_with($sourceFileName, ".osm.pbf")) {
    echo "ERROR: You must pass as first argument the name or URL of the .osm.pbf input extract" . PHP_EOL;
    exit(1);
}
logProgress("Working on file $sourceFileName in directory $workDir");

function execAndCheck(string $command): array
{
    $exRetval = 1;
    $exOutput = null;
    echo "Executing: $command" . PHP_EOL;
    exec($command, $exOutput, $exRetval);

    $msg = implode(PHP_EOL, array_map(function ($str) {
        return empty($str) ? '' : "    $str";
    }, $exOutput));
    echo $msg;
    //file_put_contents("db-init.log", $msg, FILE_APPEND);

    if ($exRetval !== 0) {
        echo 'ERROR: command execution failed' . PHP_EOL;
        exit(1);
    }
    return $exOutput;
}

logProgress('Started at ' . date('c'));

/**
 * Run osmium tags-filter with the given parameters
 * 
 * @param string $sourceFilePath
 * @param string $destinationFilePath
 * @param string|array<string> $tags
 * @param bool $cleanup
 * @param string $extraArgs
 * 
 * @see https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html
 */
function runOsmiumTagsFilter(
    string $sourceFilePath,
    string $destinationFilePath,
    string|array $tags,
    bool $cleanup = false,
    string $extraArgs = ''
): void {
    if(!is_file($sourceFilePath)) {
        throw new Exception("Can't run osmium because $sourceFilePath (the source file) is missing");
    }

    if (is_file($destinationFilePath) && $cleanup) {
        logProgress("Deleting ".basename($destinationFilePath)." as requested");
        unlink($destinationFilePath);
    } elseif (is_file($destinationFilePath) && filemtime($destinationFilePath) < filemtime($sourceFilePath)){
        logProgress("Deleting ".basename($destinationFilePath)." because older than the source ".basename($sourceFilePath)." (its source)");
        unlink($destinationFilePath);
    }

    if (is_array($tags)) {
        $quoted_tags = "'" . implode("' '", $tags) . "'";
    } else {
        $quoted_tags = "'$tags'";
    }

    if (is_file($destinationFilePath)) {
        logProgress("Data already filtered in $destinationFilePath");
    } else {
        logProgress("Filtering OSM data in $destinationFilePath...");
        execAndCheck("osmium tags-filter --verbose --input-format=pbf --output-format=pbf $extraArgs -o '$destinationFilePath' '$sourceFilePath' $quoted_tags");
        $sourceSizeMB = filesize($sourceFilePath) / 1000000;
        $destinationSizeMB = filesize($destinationFilePath) / 1000000;
        logProgress("Filtered OSM data in $destinationFilePath ($sourceSizeMB MB => $destinationSizeMB MB)");
    }
}

function runOsmiumFileInfo(string $filePath): array
{
    return execAndCheck("osmium fileinfo --extended '$filePath'");
}

function filterInputData(
    string $sourceFilePath,
    string $sourceFileName,
    string $filteredFilePath,
    bool $cleanup = false,
    bool $propagate = false,
    bool $load_text_etymology = false
): void {
    // Keep only elements that have a tag that could lead to an etymology
    $allowedTags = [];
    if ($propagate)
        $allowedTags[] = 'w/highway=residential';
    $allowedTags[] = 'wikidata';
    $allowedTags[] = 'name:etymology:wikidata';
    if ($load_text_etymology)
        $allowedTags[] = 'name:etymology';
    $allowedTags[] = 'subject:wikidata';
    $filteredWithFlagsTagsFilePath = sys_get_temp_dir() . "/filtered_with_flags_tags_$sourceFileName";
    runOsmiumTagsFilter($sourceFilePath, $filteredWithFlagsTagsFilePath, $allowedTags, $cleanup,  '--remove-tags');

    // Keep only elements that have a name
    $filteredWithFlagsNameTagsFilePath = sys_get_temp_dir() . "/filtered_with_flags_name_tags_$sourceFileName";
    runOsmiumTagsFilter($filteredWithFlagsTagsFilePath, $filteredWithFlagsNameTagsFilePath, 'name', $cleanup);

    // Remove elements not interesting or too big
    $unallowedTags = [
        'man_made=flagpole',
        'n/place=region',
        'n/place=state',
        'n/place=country',
        'n/place=continent',
        'r/admin_level=4',
        'r/admin_level=3',
        'r/admin_level=2'
    ];
    runOsmiumTagsFilter($filteredWithFlagsNameTagsFilePath, $filteredFilePath, $unallowedTags, $cleanup, '--invert-match');

    //runOsmiumFileInfo($filteredFilePath);
}

function isSchemaAlreadySetup(PDO $dbh): bool
{
    $out = $dbh->query(
        "SELECT EXISTS (
            SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='wikidata_text'
        )"
    )->fetchColumn();
    assert(is_bool($out));
    return $out;
}

function setupSchema(PDO $dbh): void
{
    logProgress('Preparing DB schema...');
    $dbh->exec(file_get_contents(__DIR__."/sql/schema.sql"));
    logProgress('DB schema prepared');
}

function setupGlobalMap(PDO $dbh): void
{
    logProgress('Preparing global map');
    $dbh->exec(file_get_contents(__DIR__."/sql/global-map.sql"));
    logProgress('Global map prepared');
}

function isOsmDataTemporaryTableAbsent(PDO $dbh): bool
{
    $out = $dbh->query(
        "SELECT NOT EXISTS (
            SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='osmdata'
        )"
    )->fetchColumn();
    assert(is_bool($out));
    return $out;
}

function loadOsmDataFromTSV(PDO $dbh, string $pgFilePath): void
{
    /** @psalm-suppress UndefinedMethod */
    $dbh->pgsqlCopyFromFile("oem.osmdata", $pgFilePath, "\t", "\\\\N", 'osm_id,osm_geometry,osm_osm_type,osm_osm_id,osm_tags');
    $n_osmdata = $dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
    assert(is_int($n_osmdata));
    logProgress("Loaded $n_osmdata OSM elements into DB");
}

function loadOsmDataWithOsm2pgsql(PDO $dbh, string $host, int $port, string $dbname, string $user, string $password, string $filteredFilePath): void
{
    execAndCheck("PGPASSWORD='$password' osm2pgsql --host='$host' --port='$port' --database='$dbname' --user='$user' --hstore-all --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 '$filteredFilePath'");
    $n_point = $dbh->query("SELECT COUNT(*) FROM planet_osm_point")->fetchColumn();
    assert(is_int($n_point));
    $n_line = $dbh->query("SELECT COUNT(*) FROM planet_osm_line")->fetchColumn();
    assert(is_int($n_line));
    $n_polygon = $dbh->query("SELECT COUNT(*) FROM planet_osm_polygon")->fetchColumn();
    assert(is_int($n_polygon));
    logProgress("Data loaded into DB ($n_point points, $n_line lines, $n_polygon polygons)");

    logProgress('Converting elements...');
    $n_element = $dbh->exec(
        "INSERT INTO oem.osmdata (
            osm_osm_type,
            osm_osm_id,
            osm_tags,
            osm_geometry
        )
        SELECT 'node', osm_id, hstore_to_jsonb(tags), way
        FROM planet_osm_point
        UNION
        SELECT
            CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS osm_type,
            CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS osm_id,
            hstore_to_jsonb(tags),
            way AS geom
        FROM planet_osm_line
        UNION
        SELECT
            CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS osm_type,
            CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS osm_id,
            hstore_to_jsonb(tags),
            way AS geom
        FROM planet_osm_polygon"
    );
    logProgress("Converted $n_element elements");
}

function removeElementsTooBig(PDO $dbh) : void {
    logProgress('Removing elements too big to be shown...');
    $n_element = $dbh->exec(
        "DELETE FROM oem.osmdata
        WHERE ST_Area(osm_geometry) >= 0.01"
    );
    $n_remaining = (int)$dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
    logProgress("Removed $n_element elements, $n_remaining remain");
}

function isElementWikidataTemporaryTableAbsent(PDO $dbh): bool
{
    $out = $dbh->query(
        "SELECT NOT EXISTS (
            SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='element_wikidata_cods'
        )"
    )->fetchColumn();
    assert(is_bool($out));
    return $out;
}

function convertElementWikidataCods(PDO $dbh): void
{
    $n_wikidata_cods = $dbh->exec(file_get_contents(__DIR__."/sql/convert-element-wikidata-cods.sql"));
    logProgress("Converted $n_wikidata_cods wikidata codes");
}

function loadWikidataEntities(PDO $dbh): void
{
    logProgress('Loading known Wikidata entities from CSV...');
    $wikidataInitFilePath = __DIR__ . "/wikidata_init.csv";
    /** @psalm-suppress UndefinedMethod */
    $dbh->pgsqlCopyFromFile("oem.wikidata", $wikidataInitFilePath, ",", "\\\\N", 'wd_wikidata_cod,wd_notes,wd_gender_descr,wd_gender_color,wd_type_descr,wd_type_color');
    $n_wd = $dbh->query("SELECT COUNT(*) FROM oem.wikidata")->fetchColumn();
    assert(is_int($n_wd));
    logProgress("Loaded $n_wd Wikidata entities from CSV");

    logProgress('Converting Wikidata entities from element_wikidata_cods...');
    $n_wd = $dbh->exec(file_get_contents(__DIR__."/sql/convert-wikidata-entities.sql"));
    logProgress("Converted $n_wd Wikidata entities from element_wikidata_cods");
}

/**
 * @param string $wikidataCodsFilter
 * @param string $relationName
 * @param array<string> $relationProps List of wikidata cods for properties to check
 * @param null|array<string> $instanceOfCods List of Wikidata cods for classes that entities must be instance of
 * @param PDO $dbh
 * @param string $wikidataEndpointURL
 */
function loadWikidataRelatedEntities(
    string $wikidataCodsFilter,
    string $relationName,
    array $relationProps,
    ?array $instanceOfCods,
    PDO $dbh,
    string $wikidataEndpointURL
): void {
    $wikidataJSONFile = "wikidata_$relationName.tmp.json";

    $n_todo = $dbh->query(
        "SELECT COUNT(DISTINCT ew_wikidata_cod)
        FROM oem.element_wikidata_cods
        WHERE $wikidataCodsFilter"
    )->fetchColumn();
    assert(is_int($n_todo));
    logProgress("Counted $n_todo Wikidata codes to check");

    $pageSize = 40000;
    for ($offset = 0; $offset < $n_todo; $offset += $pageSize) {
        $truePageSize = min($pageSize, $n_todo - $offset);
        logProgress("Checking Wikidata \"$relationName\" data ($truePageSize starting from $offset out of $n_todo)...");
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
            echo 'Check failed. Retrying to fetch...';
            $wikidataCods = $wdCheckQuery->sendAndGetWikidataCods();
        }
        $n_wikidata_cods = count($wikidataCods);

        if ($n_wikidata_cods == 0) {
            logProgress("No elements found to fetch details for");
        } else {
            logProgress("Fetching details for $n_wikidata_cods elements out of $truePageSize...");
            $wdDetailsQuery = new RelatedEntitiesDetailsWikidataQuery($wikidataCods, $relationProps, null, $instanceOfCods, $wikidataEndpointURL);
            try {
                $jsonResult = $wdDetailsQuery->sendAndGetJSONResult()->getJSON();
            } catch (Exception $e) {
                echo 'Fetch failed. Retrying to fetch...';
                $jsonResult = $wdDetailsQuery->sendAndGetJSONResult()->getJSON();
            }
            file_put_contents($wikidataJSONFile, $jsonResult);

            logProgress("Loading Wikidata \"$relationName\" data...");
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
            logProgress("Loaded $n_wd Wikidata entities and $n_wna \"$relationName\" associations");
        }
    }
}

function loadWikidataNamedAfterEntities(PDO $dbh, string $wikidataEndpointURL): void
{
    logProgress('Loading Wikidata "named after" entities...');
    loadWikidataRelatedEntities(
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

function loadWikidataConsistsOfEntities(PDO $dbh, string $wikidataEndpointURL): void
{
    logProgress('Loading Wikidata "consists of" entities...');
    loadWikidataRelatedEntities(
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

function convertEtymologies(PDO $dbh): void
{
    logProgress('Converting etymologies...');
    $n_ety = $dbh->exec(file_get_contents(__DIR__."/sql/convert-etymologies.sql"));
    logProgress("Converted $n_ety etymologies");
}

function propagateEtymologies(PDO $dbh, int $depth = 1): int
{
    if ($depth >= MAX_RECURSION_DEPTH) {
        logProgress("Reached max recursion depth, stopping propagating etymologies");
        return 0; // Recursion breaking because max recursion depth has been reached
    } else {
        logProgress("Propagating etymologies at recursion depth $depth...");
        $propagation = $dbh->prepare(file_get_contents(__DIR__."/sql/propagate-etymologies.sql"));
        $propagation->execute(["depth" => $depth]);
        $n_propagations = $propagation->rowCount();
        logProgress("Propagated $n_propagations etymologies at recursion depth $depth");

        if ($n_propagations > 0)
            $n_sub_propagations = propagateEtymologies($dbh, $depth + 1); // Recursive call
        else
            $n_sub_propagations = 0; // Recursion breaking because propagations are complete

        return $n_propagations + $n_sub_propagations;
    }
}

function saveLastDataUpdate(string $sourceFilePath, PDO $dbh): void
{
    $matches = [];
    if (preg_match('/-(\d{2})(\d{2})(\d{2})\./', $sourceFilePath, $matches) && count($matches) >= 4)
        $lastUpdate = '20' . $matches[1] . '-' . $matches[2] . '-' . $matches[3];
    else
        $lastUpdate = date('Y-m-d');

    $dbh->exec(
        "CREATE OR REPLACE FUNCTION oem.last_data_update()
            RETURNS character varying
            LANGUAGE 'sql'
        AS \$BODY$
        SELECT '$lastUpdate';
        \$BODY$;"
    );

    logProgress("Saved last data update date ($lastUpdate)");
}

function moveElementsWithEtymology(PDO $dbh, bool $load_text_etymology = false): void
{
    if($load_text_etymology) {
        logProgress('Checking elements with text etymology...');
        $n_text_ety = $dbh->exec(file_get_contents(__DIR__."/sql/check-text-etymology.sql"));
        logProgress("Found $n_text_ety elements with text etymology");
    }
    
    logProgress('Checking elements with Wikidata etymology...');
    $n_wd_ety = $dbh->exec(file_get_contents(__DIR__."/sql/check-wd-etymology.sql"));
    logProgress("Found $n_wd_ety elements with Wikidata etymology");

    logProgress('Cleaning up elements without etymology...');
    $n_tot = (int)$dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
    $n_remaining = $dbh->exec(file_get_contents(__DIR__."/sql/move-elements-with-etymology.sql"));
    $n_cleaned = $n_tot - $n_remaining;
    logProgress("Started with $n_tot elements, $n_cleaned cleaned up (no etymology), $n_remaining remaining");

    logProgress('Making sure all etymologies reference an existing element...');
    $dbh->exec(file_get_contents(__DIR__."/sql/etymology-foreign-key.sql"));
    logProgress('All etymologies reference an existing element');
}



/******************************************************************************************
 * 
 * 
 * END OF FUNCTION DEFINITION
 * 
 * START OF EXCECUTION
 * 
 * 
 ******************************************************************************************/


$osmiumFilePath = __DIR__ . "/osmium.json";
if (!is_file($osmiumFilePath)) {
    echo "ERROR: missing osmium.json" . PHP_EOL;
    exit(1);
}

$filteredFilePath = sys_get_temp_dir() . "/filtered_$sourceFileName";
$osmiumCachePath = sys_get_temp_dir() . "/osmium_${sourceFileName}_" . filesize($sourceFilePath);
$osmiumCache = "sparse_file_array,$osmiumCachePath";

if (is_file($filteredFilePath) && $cleanup)
    unlink($filteredFilePath);

$pgFilePath = sys_get_temp_dir() . "/$sourceFileName.pg";
//$pgFilePath = "$workDir/$sourceFileName.pg";
if (is_file($pgFilePath) && $cleanup) {
    unlink($pgFilePath);
}

filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath, $cleanup, $propagate, $load_text_etymology);

if (is_file($pgFilePath) && (filemtime($pgFilePath) > filemtime($sourceFilePath))) {
    logProgress('Data already exported to PostGIS tsv');
} elseif ($use_osmium_export) {
    logProgress('Exporting OSM data to PostGIS tsv...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$pgFilePath' -f 'pg' --config='$osmiumFilePath' --add-unique-id='counter' --index-type=$osmiumCache --show-errors '$filteredFilePath'");
    logProgress('Exported OSM data to PostGIS tsv');
}

try {
    if (!$conf->getBool("db-enable")) {
        throw new Exception('The usage of the DB is disabled in the configuration (check the option "db-enable"), stopping here.');
    }

    $host = (string)$conf->get("db_host");
    $port = (int)$conf->get("db_port");
    $dbname = (string)$conf->get("db_database");
    $user = (string)$conf->get("db_user");
    $password = (string)$conf->get("db_password");

    $tries = 0;
    do {
        try {
            $dbh = new PostGIS_PDO($conf);
            $dbh->query('SELECT version()');
            $failure = false;
        } catch (Exception $e) {
            $tries += 1;
            if ($tries == 60) {
                throw new Exception("Max connection tries reached, could not connect to PostgreSQL database");
            } else {
                echo "Postgres is unavailable, sleeping...";
                sleep(1);
                $failure = true;
            }
        }
    } while ($failure);

    if (empty($dbh))
        throw new Exception("Database connection initialization failed");

    $dbh->exec("CREATE EXTENSION IF NOT EXISTS postgis");
    $dbh->exec("CREATE EXTENSION IF NOT EXISTS fuzzystrmatch");
    //$dbh->exec("CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder");
    $dbh->exec("CREATE EXTENSION IF NOT EXISTS postgis_topology");
    $dbh->exec("CREATE EXTENSION IF NOT EXISTS hstore");

    try {
        $dbh->query("SELECT PostGIS_Version()");
    } catch (Exception $e) {
        throw new Exception('PostGIS is required, it is not installed on the DB and initialization failed: ' . $e->getMessage());
    }

    if ($reset) {
        logProgress('Resetting DB schema');
        $dbh->exec("DROP SCHEMA IF EXISTS oem CASCADE");
    }

    if (isSchemaAlreadySetup($dbh)) {
        logProgress('DB schema already prepared');
    } else {
        setupSchema($dbh);
    }

    if (isOsmDataTemporaryTableAbsent($dbh)) {
        logProgress('Temporary tables already deleted, not loading elements');
    } elseif ($dbh->query("SELECT EXISTS (SELECT FROM oem.osmdata)")->fetchColumn()) {
        logProgress('Elements already loaded');
    } else {
        ini_set('memory_limit', '256M');
        logProgress('Loading OSM elements into DB...');
        if ($use_osmium_export) {
            loadOsmDataFromTSV($dbh, $pgFilePath);
        } else {
            assert($use_osm2pgsql);
            loadOsmDataWithOsm2pgsql($dbh, $host, $port, $dbname, $user, $password, $filteredFilePath);
        }
        removeElementsTooBig($dbh);
        echo 'Loading complete at ' . date('c') . PHP_EOL;
    }

    if (isElementWikidataTemporaryTableAbsent($dbh)) {
        logProgress('Temporary tables already deleted, not loading wikidata entities end etymologies');
    } else {
        if ($dbh->query("SELECT EXISTS (SELECT FROM oem.element_wikidata_cods)")->fetchColumn()) {
            logProgress('Wikidata codes already converted');
        } else {
            logProgress('Converting wikidata codes...');
            convertElementWikidataCods($dbh);
        }

        if ($dbh->query("SELECT EXISTS (SELECT FROM oem.wikidata)")->fetchColumn()) {
            logProgress('Wikidata entities already loaded');
        } else {
            loadWikidataEntities($dbh);

            echo 'Download of wikidata relations started at ' . date('c') . PHP_EOL;
            $wikidataEndpointURL = (string)$conf->get("wikidata-endpoint");
            loadWikidataConsistsOfEntities($dbh, $wikidataEndpointURL);
            loadWikidataNamedAfterEntities($dbh, $wikidataEndpointURL);
            echo 'Download of wikidata relations ended at ' . date('c') . PHP_EOL;
        }

        if ($dbh->query("SELECT EXISTS (SELECT FROM oem.etymology)")->fetchColumn()) {
            logProgress('Etymologies already loaded');
        } else {
            convertEtymologies($dbh);

            if (!$keep_temp_tables) {
                $dbh->exec("DROP TABLE oem.element_wikidata_cods");
                $dbh->exec("DROP TABLE oem.wikidata_named_after");
                logProgress('Removed temporary tables');
            }
        }

        if ($propagate) {
            echo 'Propagation of etymologies started at ' . date('c') . PHP_EOL;
            propagateEtymologies($dbh);
            echo 'Propagation of etymologies ended at ' . date('c') . PHP_EOL;
        }

        echo 'Conversion complete at ' . date('c') . PHP_EOL;
    }

    if (isOsmDataTemporaryTableAbsent($dbh)) {
        logProgress('Temporary tables already deleted, not cleaning up elements');
    } else {
        // It's faster to copy elements with etymology in another table rather than to delete the majority of elements without
        // https://stackoverflow.com/a/7088514/2347196
        moveElementsWithEtymology($dbh, $load_text_etymology);

        if (!$keep_temp_tables) {
            $dbh->exec('DROP TABLE oem.osmdata');
            $dbh->exec('DROP TABLE IF EXISTS oem.planet_osm_line');
            $dbh->exec('DROP TABLE IF EXISTS oem.planet_osm_point');
            $dbh->exec('DROP TABLE IF EXISTS oem.planet_osm_polygon');
            $dbh->exec('DROP TABLE IF EXISTS oem.planet_osm_rels');
            $dbh->exec('DROP TABLE IF EXISTS oem.planet_osm_roads');
            $dbh->exec('DROP TABLE IF EXISTS oem.planet_osm_ways');
        }

        setupGlobalMap($dbh);
        saveLastDataUpdate($sourceFilePath, $dbh);
    }

    $backupFilePath = "$workDir/$sourceFileName.backup";
    if (is_file($backupFilePath) && ($cleanup || $reset)) {
        unlink($backupFilePath);
    }
    if (is_file($backupFilePath)) {
        logProgress('Backup file already generated');
    } else {
        logProgress('Generating backup file...');
        execAndCheck("PGPASSWORD='$password' pg_dump --file='$backupFilePath' --host='$host' --port='$port' --dbname='$dbname' --username='$user' --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema='oem' --verbose --no-owner --no-privileges --no-tablespaces");
        logProgress('Backup file generated');
    }

    if ($upload_to_db) {
        $up_host = (string)$conf->get("db_init_upload_host");
        $up_port = (int)$conf->get("db_init_upload_port");
        $up_user = (string)$conf->get("db_init_upload_user");
        $up_psw = (string)$conf->get("db_init_upload_password");
        $up_db = (string)$conf->get("db_init_upload_database");
        
        logProgress("Uploading data to DB $up_db on $up_host");
        $up_dbh = new PostGIS_PDO($conf, $up_host, $up_port, $up_db, $up_user, $up_psw);
        $up_dbh->exec("DROP SCHEMA IF EXISTS oem CASCADE");
        $up_dbh->exec("CREATE SCHEMA oem");
        execAndCheck("PGPASSWORD='$up_psw' pg_restore --host='$up_host' --port='$up_port' --dbname='$up_db' --username='$up_user' --no-password --schema 'oem' --verbose '$backupFilePath'");
        logProgress('Uploaded data to DB');
    }
} catch (Exception $e) {
    echo "ERROR:" . PHP_EOL . $e->getMessage() . PHP_EOL;
}

echo 'Finished at ' . date('c') . PHP_EOL;
