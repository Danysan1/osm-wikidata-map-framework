<?php
require_once("./app/IniEnvConfiguration.php");
require_once("./app/PostGIS_PDO.php");
require_once("./app/query/wikidata/RelatedEntitiesCheckWikidataQuery.php");
require_once("./app/query/wikidata/RelatedEntitiesDetailsWikidataQuery.php");

use App\IniEnvConfiguration;
use App\PostGIS_PDO;
use \App\Query\Wikidata\RelatedEntitiesCheckWikidataQuery;
use \App\Query\Wikidata\RelatedEntitiesDetailsWikidataQuery;

if (php_sapi_name() != "cli") {
    http_response_code(400);
    die("Only runnable through CLI");
}

if (in_array("--help", $argv) || in_array("-h", $argv)) {
    echo
    "Usage: php db-init.php SOURCE_FILE [OPTIONS]" . PHP_EOL .
        "\tSOURCE_FILE: a .pbf file in web/" . PHP_EOL .
        "\tOPTIONS: an optional combination of one or more of these flags:" . PHP_EOL .
        "\t\t--keep-temp-tables / -k : Don't delete temporary tables after elaborating" . PHP_EOL .
        "\t\t--cleanup / -c : Delete temporary files before elaborating" . PHP_EOL .
        "\t\t--hard-reset / -r : Do a hard reset (delete ordinary tables) before elaborating" . PHP_EOL .
        "\t\t--propagate / -p : Propagate etymologies to nearby highways with same name" . PHP_EOL;
    exit(0);
}

define("MAX_RECURSION_DEPTH", 10);

$output = [];
$retval = null;
$use_osmium_export = FALSE;
$use_osm2pgsql = FALSE;
$convert_to_geojson = FALSE;
$convert_to_pg = FALSE;
$convert_to_txt = FALSE;
$keep_temp_tables = in_array("--keep-temp-tables", $argv) || in_array("-k", $argv);
$cleanup = in_array("--cleanup", $argv) || in_array("-c", $argv);
$reset = in_array("--hard-reset", $argv) || in_array("-r", $argv);
$propagate = in_array("--propagate", $argv) || in_array("-p", $argv);

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

if (empty($argv[1])) {
    echo "ERROR: You must pass as first argument the name of the .pbf input extract" . PHP_EOL;
    exit(1);
}

$sourceFilePath = realpath($argv[1]);
if (empty($sourceFilePath)) {
    echo "ERROR: Could not deduce full path for the given file: " . $argv[1] . PHP_EOL;
    exit(1);
} elseif (!is_file($sourceFilePath)) {
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
logProgress("Working on file $sourceFileName in directory $workDir");

if ($keep_temp_tables)
    echo 'Keeping temporary tables' . PHP_EOL;

if ($cleanup)
    echo 'Doing a cleanup of temporary files' . PHP_EOL;

if ($reset)
    echo 'Doing a hard reset' . PHP_EOL;

if ($reset)
    echo 'Propagating etymology to nearby highways' . PHP_EOL;

if (!empty($argv[2]) && $argv[2] == "txt") {
    echo 'Using osmium-export to txt' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_txt = TRUE;
} elseif (!empty($argv[2]) && $argv[2] == "geojson") {
    echo 'Using osmium-export to geojson' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_geojson = TRUE;
} elseif (!empty($argv[2]) && $argv[2] == "pg") {
    echo 'Using osmium-export to PostGIS tsv' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_pg = TRUE;
} elseif (!empty($argv[2]) && $argv[2] == "osm2pgsql") {
    echo 'Using osm2pgsql' . PHP_EOL;
    exec("which osm2pgsql", $output, $retval);
    if ($retval !== 0) {
        echo "ERROR: osm2pgsql is not installed" . PHP_EOL;
        exit(1);
    }
    $use_osm2pgsql = TRUE;
} else {
    echo 'Using osmium-export to pg (default)' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_pg = TRUE;
}
$use_db = $use_osm2pgsql || $convert_to_pg;

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
    if (is_file($destinationFilePath) && $cleanup) {
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
    bool $propagate = false
): void {
    $filteredWithFlagsNameTagsFilePath = sys_get_temp_dir() . "/filtered_with_flags_name_tags_$sourceFileName";

    $allowedTags = $propagate ? ['w/highway=residential'] : [];
    $allowedTags[] = 'wikidata';
    $allowedTags[] = 'name:etymology:wikidata';
    $allowedTags[] = 'name:etymology';
    $allowedTags[] = 'subject:wikidata';

    $filteredWithFlagsTagsFilePath = sys_get_temp_dir() . "/filtered_with_flags_tags_$sourceFileName";
    runOsmiumTagsFilter($sourceFilePath, $filteredWithFlagsTagsFilePath, $allowedTags, $cleanup,  '--remove-tags');

    runOsmiumTagsFilter($filteredWithFlagsTagsFilePath, $filteredWithFlagsNameTagsFilePath, 'name', $cleanup);

    runOsmiumTagsFilter($filteredWithFlagsNameTagsFilePath, $filteredFilePath, 'man_made=flagpole', $cleanup, '--invert-match');

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
    $dbh->exec("CREATE SCHEMA IF NOT EXISTS oem AUTHORIZATION oem");
    $dbh->exec('DROP TABLE IF EXISTS oem.wikidata_text');
    $dbh->exec('DROP TABLE IF EXISTS oem.wikidata_picture');
    $dbh->exec('DROP TABLE IF EXISTS oem.etymology');
    $dbh->exec('DROP TABLE IF EXISTS oem.wikidata_named_after');
    $dbh->exec('DROP TABLE IF EXISTS oem.wikidata');
    $dbh->exec('DROP TABLE IF EXISTS oem.element_wikidata_cods');
    $dbh->exec('DROP TABLE IF EXISTS oem.element');
    $dbh->exec('DROP TABLE IF EXISTS oem.osmdata');
    $dbh->exec('DROP FUNCTION IF EXISTS oem.translateTimestamp');
    $dbh->exec('DROP VIEW IF EXISTS oem.v_global_map');
    $dbh->exec(
        "CREATE FUNCTION oem.translateTimestamp(IN txt TEXT, OUT ts TIMESTAMP) AS $$
        DECLARE
            nonZeroTxt TEXT := REPLACE(REPLACE(txt, '0000-', '0001-'), '-00-00', '-01-01');
        BEGIN
            ts := CASE
                WHEN nonZeroTxt IS NULL THEN NULL
                WHEN LEFT(nonZeroTxt,1)!='-' AND SPLIT_PART(nonZeroTxt,'-',1)::BIGINT>294276 THEN NULL -- Timestamp after 294276 AD, not supported
                WHEN LEFT(nonZeroTxt,1)='-' AND SPLIT_PART(SUBSTRING(nonZeroTxt,2),'-',1)::BIGINT>4713 THEN NULL -- Timestamp before 4713 BC, not supported
                WHEN LEFT(nonZeroTxt,1)='-' THEN CONCAT(SUBSTRING(nonZeroTxt,2),' BC')::TIMESTAMP -- BC timestamp
                ELSE nonZeroTxt::TIMESTAMP -- AD timestamp
            END;
        END;
        $$ LANGUAGE plpgsql;"
    );
    $dbh->exec(
        "COMMENT ON FUNCTION oem.translateTimestamp(text) IS '
        Takes as input an ISO 8601 timestamp string and returns a TIMESTAMP, unless the string is not representable (e.g. it overflows).
        Documentation:
        - https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-TABLE
        - https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT
        ';"
    );
    $dbh->exec(
        "CREATE TABLE oem.osmdata (
            osm_id BIGSERIAL NOT NULL PRIMARY KEY,
            osm_geometry GEOMETRY NOT NULL,
            osm_osm_type VARCHAR(8) NOT NULL CHECK (osm_osm_type IN ('node','way','relation')),
            osm_osm_id BIGINT NOT NULL,
            osm_tags JSONB
        )"
    );
    $dbh->exec(
        "CREATE TABLE oem.element_wikidata_cods (
            --ew_id BIGSERIAL NOT NULL PRIMARY KEY,
            ew_el_id BIGINT NOT NULL,
            ew_wikidata_cod VARCHAR(15) NOT NULL CHECK (ew_wikidata_cod  ~* '^Q\d+$'),
            ew_from_name_etymology BOOLEAN,
            ew_from_subject BOOLEAN,
            ew_from_wikidata BOOLEAN
        )"
    );
    $dbh->exec(
        "CREATE TABLE oem.wikidata (
            wd_id SERIAL NOT NULL PRIMARY KEY,
            wd_wikidata_cod VARCHAR(15) NOT NULL UNIQUE CHECK (wd_wikidata_cod ~* '^Q\d+$'),
            wd_position GEOMETRY,
            wd_event_date TIMESTAMP,
            wd_event_date_precision INT,
            wd_start_date TIMESTAMP,
            wd_start_date_precision INT,
            wd_end_date TIMESTAMP,
            wd_end_date_precision INT,
            wd_birth_date TIMESTAMP,
            wd_birth_date_precision INT,
            wd_death_date TIMESTAMP,
            wd_death_date_precision INT,
            wd_commons VARCHAR,
            wd_gender_id INT REFERENCES oem.wikidata(wd_id),
            wd_instance_id INT REFERENCES oem.wikidata(wd_id),
            wd_download_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            wd_full_download_date TIMESTAMP DEFAULT NULL,
            wd_notes VARCHAR,
            wd_gender_descr VARCHAR,
            wd_gender_color VARCHAR,
            wd_type_descr VARCHAR,
            wd_type_color VARCHAR
        )"
    );
    $dbh->exec("CREATE UNIQUE INDEX wikidata_id_idx ON oem.wikidata (wd_id) WITH (fillfactor='100')");
    $dbh->exec("CREATE UNIQUE INDEX wikidata_cod_idx ON oem.wikidata (wd_wikidata_cod) WITH (fillfactor='100')");
    $dbh->exec(
        "CREATE TABLE oem.element (
            el_id BIGINT NOT NULL PRIMARY KEY,
            el_geometry GEOMETRY NOT NULL,
            el_osm_type VARCHAR(8) NOT NULL CHECK (el_osm_type IN ('node','way','relation')),
            el_osm_id BIGINT NOT NULL,
            el_tags JSONB,
            el_text_etymology VARCHAR,
            el_wd_id BIGINT REFERENCES oem.wikidata(wd_id),
            el_commons VARCHAR,
            el_wikipedia VARCHAR
            --CONSTRAINT element_unique_osm_id UNIQUE (el_osm_type, el_osm_id) --! causes errors with osm2pgsql as it creates duplicates, see https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
        )"
    );
    $dbh->exec("CREATE UNIQUE INDEX element_id_idx ON oem.element (el_id) WITH (fillfactor='100')");
    $dbh->exec("CREATE INDEX element_geometry_idx ON oem.element USING GIST (el_geometry) WITH (fillfactor='100')");
    $dbh->exec(
        "CREATE TABLE oem.etymology (
            --et_el_id BIGINT NOT NULL REFERENCES oem.element(el_id), -- element is populated only at the end
            et_el_id BIGINT NOT NULL,
            et_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
            et_from_el_id BIGINT,
            et_recursion_depth INT DEFAULT 0,
            et_from_osm BOOLEAN,
            et_from_name_etymology BOOLEAN,
            et_from_name_etymology_consists BOOLEAN,
            et_from_subject BOOLEAN,
            et_from_subject_consists BOOLEAN,
            et_from_wikidata BOOLEAN,
            et_from_wikidata_named_after BOOLEAN,
            et_from_wikidata_dedicated_to BOOLEAN,
            et_from_wikidata_commemorates BOOLEAN,
            et_from_bad_not_consists BOOLEAN,
            et_from_bad_consists BOOLEAN,
            et_from_wikidata_wd_id INT REFERENCES oem.wikidata(wd_id),
            et_from_wikidata_prop_cod VARCHAR CHECK (et_from_wikidata_prop_cod ~* '^P\d+$'),
            CONSTRAINT etymology_pkey PRIMARY KEY (et_el_id, et_wd_id)
        )"
    );
    $dbh->exec("CREATE INDEX etymology_el_id_idx ON oem.etymology (et_el_id) WITH (fillfactor='100')");
    $dbh->exec(
        "CREATE TABLE oem.wikidata_picture (
            wdp_id SERIAL NOT NULL PRIMARY KEY,
            wdp_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
            wdp_picture VARCHAR NOT NULL,
            wdp_attribution VARCHAR,
            wdp_download_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            wdp_full_download_date TIMESTAMP
        )"
    );
    $dbh->exec("CREATE INDEX wikidata_picture_id_idx ON oem.wikidata_picture (wdp_wd_id) WITH (fillfactor='100')");
    $dbh->exec(
        "CREATE TABLE oem.wikidata_named_after (
            wna_id SERIAL NOT NULL PRIMARY KEY,
            wna_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
            wna_named_after_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
            wna_from_prop_cod VARCHAR CHECK (wna_from_prop_cod ~* '^P\d+$')
        )"
    );
    $dbh->exec(
        "CREATE TABLE oem.wikidata_text (
            wdt_id SERIAL NOT NULL PRIMARY KEY,
            wdt_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
            wdt_language CHAR(2) NOT NULL,
            wdt_name VARCHAR,
            wdt_description VARCHAR,
            wdt_wikipedia_url VARCHAR,
            wdt_occupations VARCHAR,
            wdt_citizenship VARCHAR,
            wdt_prizes VARCHAR,
            wdt_event_place VARCHAR,
            wdt_birth_place VARCHAR,
            wdt_death_place VARCHAR,
            wdt_download_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            wdt_full_download_date TIMESTAMP,
            CONSTRAINT wikidata_text_unique_wikidata_language UNIQUE (wdt_wd_id, wdt_language)
        )"
    );
    $dbh->exec("CREATE INDEX wikidata_text_id_idx ON oem.wikidata_text (wdt_wd_id) WITH (fillfactor='100')");
    $dbh->exec(
        "CREATE VIEW oem.v_global_map AS
        SELECT
            ST_ReducePrecision(ST_Centroid(el_geometry), 0.1) AS geom,
            COUNT(DISTINCT COALESCE(el_tags->>'name', el_id::TEXT)) AS num
        FROM oem.etymology
        JOIN oem.element ON et_el_id = el_id
        GROUP BY geom"
    );
    logProgress('DB schema prepared');
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
    $n_wikidata_cods = $dbh->exec(
        "INSERT INTO oem.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_from_name_etymology, ew_from_subject, ew_from_wikidata)
        SELECT osm_id, UPPER(TRIM(wikidata_cod)), FALSE, FALSE, TRUE
        FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'wikidata',';') AS splitted(wikidata_cod)
        WHERE osm_tags ? 'wikidata'
        AND TRIM(wikidata_cod) ~* '^Q\d+$'
        UNION
        SELECT osm_id, UPPER(TRIM(subject_wikidata_cod)), FALSE, TRUE, FALSE
        FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'subject:wikidata',';') AS splitted(subject_wikidata_cod)
        WHERE osm_tags ? 'subject:wikidata'
        AND TRIM(subject_wikidata_cod) ~* '^Q\d+$'
        UNION
        SELECT osm_id, UPPER(TRIM(name_etymology_wikidata_cod)), TRUE, FALSE, FALSE
        FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'name:etymology:wikidata',';') AS splitted(name_etymology_wikidata_cod)
        WHERE osm_tags ? 'name:etymology:wikidata'
        AND TRIM(name_etymology_wikidata_cod) ~* '^Q\d+$'"
    );
    logProgress("Converted $n_wikidata_cods wikidata codes");
}

function loadWikidataEntities(PDO $dbh): void
{
    logProgress('Loading Wikidata etymology entities...');

    /** @psalm-suppress UndefinedMethod */
    $dbh->pgsqlCopyFromFile("oem.wikidata", "wikidata_init.csv", ",", "\\\\N", 'wd_wikidata_cod,wd_notes,wd_gender_descr,wd_gender_color,wd_type_descr,wd_type_color');
    $n_wd = $dbh->query("SELECT COUNT(*) FROM oem.wikidata")->fetchColumn();
    assert(is_int($n_wd));
    logProgress("Loaded $n_wd Wikidata entities from CSV");

    $n_wd = $dbh->exec(
        "INSERT INTO oem.wikidata (wd_wikidata_cod)
        SELECT DISTINCT ew_wikidata_cod
        FROM oem.element_wikidata_cods
        LEFT JOIN oem.wikidata ON wd_wikidata_cod = ew_wikidata_cod
        WHERE (ew_from_name_etymology OR ew_from_subject)
        AND wikidata IS NULL"
    );
    logProgress("Loaded $n_wd Wikidata entities from element_wikidata_cods");
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
        $truePageSize = min($pageSize, $n_todo-$offset);
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
        try{
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
            try{
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
        ["P138", "P825", "P547"], // named after/dedicated to/commemorates  -  https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-etymology-data
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
        ["Q14073567", "Q10648343", "Q16334295", "Q219160"], // sibling duo, duo, group of humans, couple
        $dbh,
        $wikidataEndpointURL
    );
}

function convertEtymologies(PDO $dbh): void
{
    logProgress('Converting etymologies...');
    $n_ety = $dbh->exec(
        "INSERT INTO oem.etymology (
            et_el_id,
            et_wd_id,
            et_from_el_id,
            et_from_osm,
            et_from_wikidata,
            et_from_name_etymology,
            et_from_name_etymology_consists,
            et_from_subject,
            et_from_subject_consists,
            et_from_wikidata_named_after,
            et_from_wikidata_dedicated_to,
            et_from_wikidata_commemorates,
            et_from_bad_not_consists,
            et_from_bad_consists,
            et_from_wikidata_wd_id,
            et_from_wikidata_prop_cod
        ) SELECT
            ew_el_id,
            wd_id,
            MIN(ew_el_id) AS from_el_id,
            BOOL_OR(wna_from_prop_cod IS NULL) AS from_osm, -- derived directly from OSM
            BOOL_OR(wna_from_prop_cod IS NOT NULL) AS from_wikidata, -- derived through Wikidata
            BOOL_OR(wna_from_prop_cod IS NULL AND ew_from_name_etymology) AS from_name_etymology, -- derived directly from OSM ('name:etymology')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527' AND ew_from_name_etymology) AS from_name_etymology_consists, -- derived through OSM ('name:etymology') and then Wikidata ('consists')
            BOOL_OR(wna_from_prop_cod IS NULL AND ew_from_subject) AS from_subject, -- derived directly from OSM ('subject')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527' AND ew_from_subject) AS from_subject_consists, -- derived through OSM ('subject') and then Wikidata ('consists')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P138' AND ew_from_wikidata) AS from_wikidata_named_after, -- derived through OSM ('wikidata') and then Wikidata ('named after')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P825' AND ew_from_wikidata) AS from_wikidata_dedicated_to, -- derived through OSM ('wikidata') and then Wikidata ('dedicated to')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P547' AND ew_from_wikidata) AS from_wikidata_commemorates, -- derived through OSM ('wikidata') and then Wikidata ('commemorates')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod!='P527' AND NOT ew_from_wikidata) AS from_bad_not_consists, -- wrong etymology, derived through OSM ('subject'/'name:etymology') and then Wikidata (not 'consists')
            BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527' AND ew_from_wikidata) AS from_bad_consists, -- wrong etymology, derived through OSM ('wikidata') and then Wikidata ('consists')
            MIN(from_wd_id) AS from_wikidata_wd_id,
            MIN(wna_from_prop_cod) AS from_wikidata_prop_cod
        FROM (
            SELECT DISTINCT
                ew_el_id,
                wd_id,
                ew_from_name_etymology,
                ew_from_subject,
                ew_from_wikidata,
                NULL::BIGINT AS from_wd_id,
                NULL::VARCHAR AS wna_from_prop_cod
            FROM oem.element_wikidata_cods
            JOIN oem.wikidata ON ew_wikidata_cod = wd_wikidata_cod
            WHERE ew_from_name_etymology OR ew_from_subject
            UNION
            SELECT DISTINCT
                ew.ew_el_id,
                nawd.wd_id,
                ew_from_name_etymology,
                ew_from_subject,
                ew_from_wikidata,
                wd.wd_id AS from_wd_id,
                wna_from_prop_cod
            FROM oem.element_wikidata_cods AS ew
            JOIN oem.wikidata AS wd ON ew.ew_wikidata_cod = wd.wd_wikidata_cod
            JOIN oem.wikidata_named_after AS wna ON wd.wd_id = wna.wna_wd_id
            JOIN oem.wikidata AS nawd ON wna.wna_named_after_wd_id = nawd.wd_id
            WHERE wna_from_prop_cod IS NOT NULL
            AND wna_from_prop_cod='P527'
            AND (ew_from_name_etymology OR ew_from_subject)
            UNION
            SELECT DISTINCT
                ew.ew_el_id,
                nawd.wd_id,
                ew_from_name_etymology,
                ew_from_subject,
                ew_from_wikidata,
                wd.wd_id AS from_wd_id,
                wna_from_prop_cod
            FROM oem.element_wikidata_cods AS ew
            JOIN oem.wikidata AS wd ON ew.ew_wikidata_cod = wd.wd_wikidata_cod
            JOIN oem.wikidata_named_after AS wna ON wd.wd_id = wna.wna_wd_id
            JOIN oem.wikidata AS nawd ON wna.wna_named_after_wd_id = nawd.wd_id
            WHERE wna_from_prop_cod IS NOT NULL
            AND wna_from_prop_cod!='P527'
            AND ew_from_wikidata
        ) AS x
        GROUP BY ew_el_id, wd_id"
    );
    logProgress("Converted $n_ety etymologies");
}

function propagateEtymologies(PDO $dbh, int $depth = 1): int
{
    if ($depth >= MAX_RECURSION_DEPTH) {
        logProgress("Reached max recursion depth, stopping propagating etymologies");
        return 0; // Recursion breaking because max recursion depth has been reached
    } else {
        logProgress("Propagating etymologies at recursion depth $depth...");
        $propagation = $dbh->prepare(
            "INSERT INTO oem.etymology (
                et_el_id,
                et_wd_id,
                et_from_el_id,
                et_recursion_depth,
                et_from_osm,
                et_from_wikidata,
                et_from_name_etymology,
                et_from_name_etymology_consists,
                et_from_subject,
                et_from_subject_consists,
                et_from_wikidata_named_after,
                et_from_wikidata_dedicated_to,
                et_from_wikidata_commemorates,
                et_from_bad_not_consists,
                et_from_bad_consists,
                et_from_wikidata_wd_id,
                et_from_wikidata_prop_cod
            ) SELECT DISTINCT ON (new_el.osm_id, old_et.et_wd_id)
                new_el.osm_id,
                old_et.et_wd_id,
                old_et.et_from_el_id,
                :depth AS recursion_depth,
                old_et.et_from_osm,
                old_et.et_from_wikidata,
                old_et.et_from_name_etymology,
                old_et.et_from_name_etymology_consists,
                old_et.et_from_subject,
                old_et.et_from_subject_consists,
                old_et.et_from_wikidata_named_after,
                old_et.et_from_wikidata_dedicated_to,
                old_et.et_from_wikidata_commemorates,
                old_et.et_from_bad_not_consists,
                old_et.et_from_bad_consists,
                old_et.et_from_wikidata_wd_id,
                old_et.et_from_wikidata_prop_cod
            FROM oem.etymology AS old_et
            JOIN oem.osmdata AS old_el
                ON old_et.et_el_id = old_el.osm_id
                AND old_el.osm_tags ?? 'name' -- As of PHP 7.4.0, question marks can be escaped by doubling them. That means that the ?? string will be translated to ? when sending the query to the database.
            JOIN oem.osmdata AS new_el
                ON old_el.osm_id < new_el.osm_id
                AND new_el.osm_tags ?? 'name'
                AND old_el.osm_tags->'name' = new_el.osm_tags->'name'
                AND ST_Intersects(old_el.osm_geometry, new_el.osm_geometry)
            LEFT JOIN oem.etymology AS new_et ON new_et.et_el_id = new_el.osm_id
            WHERE old_et.et_recursion_depth = (:depth - 1)
            AND new_et IS NULL"
        );
        $propagation->execute(["depth"=>$depth]);
        $n_propagations = $propagation->rowCount();
        logProgress("Propagated $n_propagations etymologies at recursion depth $depth");

        if ($n_propagations > 0)
            $n_sub_propagations = propagateEtymologies($dbh, $depth + 1); // Recursive call
        else
            $n_sub_propagations = 0; // Recursion breaking because propagations are complete

        return $n_propagations + $n_sub_propagations;
    }
}

function saveLastDataUpdate(string $sourceFilePath, PDO $dbh): void {
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

function cleanupElementsWithoutEtymology(PDO $dbh): void {
    logProgress('Cleaning up elements without etymology...');
    $n_tot = (int)$dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
    /*$n_cleaned = $dbh->exec(
        "DELETE FROM oem.osmdata WHERE osm_id NOT IN (SELECT DISTINCT et_el_id FROM oem.etymology)"
    );
    $n_remaining = $n_tot - $n_cleaned;
    $dbh->exec('ALTER TABLE oem.osmdata RENAME TO element');*/
    // It's faster to copy elements with etymology in another table rather than to delete the majority of elements without; https://stackoverflow.com/a/7088514/2347196
    $n_remaining = $dbh->exec(
        "INSERT INTO oem.element (
            el_id,
            el_geometry,
            el_osm_type,
            el_osm_id,
            el_tags,
            el_text_etymology,
            el_wd_id,
            el_commons,
            el_wikipedia
        ) SELECT 
            osm_id,
            osm_geometry,
            osm_osm_type,
            osm_osm_id,
            osm_tags,
            osm_tags->>'name:etymology',
            wikidata.wd_id,
            SUBSTRING(osm_tags->>'wikimedia_commons' FROM '^([^;]+)'),
            SUBSTRING(osm_tags->>'wikipedia' FROM '^([^;]+)')
        FROM oem.osmdata
        LEFT JOIN oem.wikidata ON wd_wikidata_cod = SUBSTRING(osm_tags->>'wikidata' FROM '^([^;]+)')
        WHERE osm_tags ? 'name:etymology'
        OR osm_id IN (SELECT DISTINCT et_el_id FROM oem.etymology)
        AND ST_Area(osm_geometry) < 0.01 -- Remove elements too big to be shown"
    );
    $n_cleaned = $n_tot - $n_remaining;
    logProgress("Started with $n_tot elements, $n_cleaned cleaned up (no etymology), $n_remaining remaining");
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


if (!is_file("osmium.json")) {
    echo "ERROR: missing osmium.json" . PHP_EOL;
    exit(1);
}

$filteredFilePath = sys_get_temp_dir() . "/filtered_$sourceFileName";
$osmiumCachePath = sys_get_temp_dir() . "/osmium_${sourceFileName}_" . filesize($sourceFilePath);
$osmiumCache = "sparse_file_array,$osmiumCachePath";

if (is_file($filteredFilePath) && $cleanup)
    unlink($filteredFilePath);

//$txtFilePath = sys_get_temp_dir() . "/$sourceFileName.txt";
$txtFilePath = "$workDir/$sourceFileName.txt";
if (is_file($txtFilePath) && $cleanup) {
    unlink($txtFilePath);
}
if (is_file($txtFilePath)) {
    logProgress('Data already exported to text');
} elseif ($convert_to_txt) {
    filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath, $cleanup, $propagate);
    logProgress('Exporting OSM data to text...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$txtFilePath' -f 'txt' --config='osmium.json' --add-unique-id='counter' --index-type=$osmiumCache '$filteredFilePath'");
    logProgress('Exported OSM data to text');
}

//$geojsonFilePath = sys_get_temp_dir() . "/$sourceFileName.geojson";
$geojsonFilePath = "$workDir/$sourceFileName.geojson";
if (is_file($geojsonFilePath) && $cleanup) {
    unlink($geojsonFilePath);
}
if (is_file($geojsonFilePath)) {
    logProgress('Data already exported to geojson');
} elseif ($convert_to_geojson) {
    filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath, $cleanup, $propagate);
    logProgress('Exporting OSM data to geojson...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$geojsonFilePath' -f 'geojson' --config='osmium.json' --add-unique-id='counter' --index-type=$osmiumCache '$filteredFilePath'");
    logProgress('Exported OSM data to geojson');
}

$pgFilePath = sys_get_temp_dir() . "/$sourceFileName.pg";
//$pgFilePath = "$workDir/$sourceFileName.pg";
if (is_file($pgFilePath) && $cleanup) {
    unlink($pgFilePath);
}
if (is_file($pgFilePath)) {
    logProgress('Data already exported to PostGIS tsv');
} elseif ($convert_to_pg) {
    filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath, $cleanup, $propagate);
    logProgress('Exporting OSM data to PostGIS tsv...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$pgFilePath' -f 'pg' --config='osmium.json' --add-unique-id='counter' --index-type=$osmiumCache '$filteredFilePath'");
    logProgress('Exported OSM data to PostGIS tsv');
}


if ($use_db) {
    try {
        $conf = new IniEnvConfiguration();
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
                    echo "ERROR: max connection tries reached, could not connect to PostgreSQL database" . PHP_EOL;
                    exit(1);
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
            echo 'ERROR: PostGIS is required, it is not installed on the DB and initialization failed: ' . $e->getMessage();
            exit(1);
        }

        if ($reset) {
            logProgress('Resetting DB schema');
            $dbh->exec("DROP SCHEMA IF EXISTS oem CASCADE");
        }

        if (isSchemaAlreadySetup($dbh)) {
            logProgress('DB schema already prepared');
        } else {
            logProgress('Preparing DB schema...');
            setupSchema($dbh);
        }

        if (isOsmDataTemporaryTableAbsent($dbh)) {
            logProgress('Temporary tables already deleted, not loading elements');
        } elseif ($dbh->query("SELECT EXISTS (SELECT FROM oem.osmdata)")->fetchColumn()) {
            logProgress('Elements already loaded');
        } else {
            ini_set('memory_limit', '256M');
            if ($convert_to_pg) {
                logProgress('Loading OSM elements into DB...');
                loadOsmDataFromTSV($dbh, $pgFilePath);
            } else { // use_osm2pgsql
                logProgress('Loading data into DB...');
                loadOsmDataWithOsm2pgsql($dbh, $host, $port, $dbname, $user, $password, $filteredFilePath);
            }

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
            cleanupElementsWithoutEtymology($dbh);
            
            if (!$keep_temp_tables)
                $dbh->exec('DROP TABLE oem.osmdata');

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
            execAndCheck("PGPASSWORD='$password' pg_dump --file='$backupFilePath' --host='$host' --port='$port' --dbname='$dbname' --username='$user' --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema='oem' --verbose");
            logProgress('Backup file generated...');
        }
    } catch (Exception $e) {
        echo "ERROR:" . PHP_EOL . $e->getMessage() . PHP_EOL;
    }

    echo 'Finished at ' . date('c') . PHP_EOL;
}
