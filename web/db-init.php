<?php
require_once("./app/IniFileConfiguration.php");
require_once("./app/PostGIS_PDO.php");
require_once("./app/query/wikidata/JSONWikidataQuery.php");

use App\IniFileConfiguration;
use App\PostGIS_PDO;
use \App\Query\Wikidata\JSONWikidataQuery;

if (php_sapi_name() != "cli") {
    http_response_code(400);
    die("Only runnable through CLI");
}

$output = [];
$retval = null;
$use_osmium_export = FALSE;
$use_osm2pgsql = FALSE;
$convert_to_geojson = FALSE;
$convert_to_pg = FALSE;
$convert_to_txt = FALSE;
$keep_temp_tables = in_array("--keep-temp-tables", $argv) || in_array("-k", $argv);
$reset = in_array("--hard-reset", $argv) || in_array("-r", $argv);

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
$workDir = dirname($sourceFilePath);
$sourceFileName = basename($sourceFilePath);
$sourceFileHash = hash_file('sha1', $sourceFilePath);
echo "Working on file $sourceFileName in directory $workDir" . PHP_EOL;

if ($keep_temp_tables)
    echo 'Keeping temporary tables' . PHP_EOL;

if ($reset)
    echo 'Doing a hard reset of the DB' . PHP_EOL;

if (!empty($argv[2]) && $argv[2] == "txt") {
    echo 'Using osmium-export to txt' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_txt = TRUE;
} elseif (!empty($argv[2]) && $argv[2] == "geojson") {
    echo 'Using osmium-export to geojson' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_geojson = TRUE;
} elseif (!empty($argv[2]) && $argv[2] == "pg") {
    echo 'Using osmium-export to pg' . PHP_EOL;
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
    echo implode(PHP_EOL, array_map(function ($str) {
        return empty($str) ? '' : "    $str";
    }, $exOutput));
    if ($exRetval !== 0) {
        echo 'ERROR: command execution failed' . PHP_EOL;
        exit(1);
    }
    return $exOutput;
}

echo 'Started at ' . date('c') . PHP_EOL;

function logProgress(string $message): void
{
    echo "$message \t|--------------------------------------------------" . PHP_EOL;
}

function filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath)
{
    $filteredTmpFile = sys_get_temp_dir() . "/filtered_with_flags_$sourceFileName";
    if (is_file($filteredTmpFile)) {
        logProgress('Data already filtered from elements without etymology');
    } else {
        logProgress('Filtering OSM data from elements without etymology...');
        /**
         * @link https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html
         */
        execAndCheck("osmium tags-filter --verbose --remove-tags --input-format=pbf --output-format=pbf --overwrite -o '$filteredTmpFile' '$sourceFilePath' 'wikidata,subject:wikidata,name:etymology:wikidata'");
        logProgress('Filtered OSM data from elements without etymology');
    }

    if (is_file($filteredFilePath)) {
        logProgress('Data already filtered from non-interesting elements');
    } else {
        logProgress('Filtering OSM data from non-interesting elements...');
        /**
         * @link https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html
         */
        execAndCheck("osmium tags-filter --verbose --invert-match --input-format=pbf --output-format=pbf --overwrite -o '$filteredFilePath' '$filteredTmpFile' 'man_made=flagpole'");
        logProgress('Filtered OSM data from non-interesting elements');
    }
}

function isSchemaAlreadySetup(PDO $dbh): bool
{
    return $dbh->query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='wikidata_text')")->fetchColumn();
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
    $dbh->exec('DROP FUNCTION IF EXISTS translateTimestamp');
    $dbh->exec(
        "CREATE FUNCTION translateTimestamp(IN text TEXT)
            RETURNS timestamp without time zone
            LANGUAGE 'sql' AS \$BODY$
        SELECT CASE
            WHEN $1 IS NULL THEN NULL
            WHEN LEFT($1,1)!='-' AND SPLIT_PART($1,'-',1)::BIGINT>294276 THEN NULL -- https://www.postgresql.org/docs/9.1/datatype-datetime.html#DATATYPE-DATETIME-TABLE
            WHEN LEFT($1,1)='-' AND SPLIT_PART(SUBSTRING($1,2),'-',1)::BIGINT>4713 THEN NULL
            WHEN LEFT($1,1)='-' THEN CONCAT(SUBSTRING($1,2),' BC')::TIMESTAMP
            ELSE $1::TIMESTAMP
        END;
        \$BODY$;"
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
        "CREATE TABLE oem.element (
            el_id BIGSERIAL NOT NULL PRIMARY KEY,
            el_geometry GEOMETRY NOT NULL,
            el_osm_type VARCHAR(8) NOT NULL CHECK (el_osm_type IN ('node','way','relation')),
            el_osm_id BIGINT NOT NULL,
            el_tags JSONB,
            el_commons VARCHAR,
            el_wikipedia VARCHAR
            --CONSTRAINT element_unique_osm_id UNIQUE (el_osm_type, el_osm_id) --! causes errors with osm2pgsql as it creates duplicates, see https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
        )"
    );
    $dbh->exec("CREATE UNIQUE INDEX element_id_idx ON oem.element (el_id) WITH (fillfactor='100')");
    $dbh->exec("CREATE INDEX element_geometry_idx ON oem.element USING GIST (el_geometry) WITH (fillfactor='100')");
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
            wd_full_download_date TIMESTAMP DEFAULT NULL
        )"
    );
    $dbh->exec("CREATE UNIQUE INDEX wikidata_id_idx ON oem.wikidata (wd_id) WITH (fillfactor='100')");
    $dbh->exec("CREATE UNIQUE INDEX wikidata_cod_idx ON oem.wikidata (wd_wikidata_cod) WITH (fillfactor='100')");
    $dbh->exec(
        "CREATE TABLE oem.etymology (
            --et_el_id BIGINT NOT NULL REFERENCES oem.element(el_id), -- element is populated only at the end
            et_el_id BIGINT NOT NULL,
            et_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
            et_from_osm BOOLEAN,
            et_from_osm_el_id BIGINT,
            et_from_name_etymology BOOLEAN,
            et_from_name_etymology_consists BOOLEAN,
            et_from_subject BOOLEAN,
            et_from_subject_consists BOOLEAN,
            et_from_wikidata BOOLEAN,
            et_from_wikidata_named_after BOOLEAN,
            et_from_wikidata_dedicated_to BOOLEAN,
            et_from_wikidata_commemorates BOOLEAN,
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
    logProgress('DB schema prepared');
}

function isOsmDataTemporaryTableAbsent(PDO $dbh): bool
{
    return $dbh->query(
        "SELECT NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='osmdata')"
    )->fetchColumn();
}

function loadOsmDataFromTSV(PDO $dbh, string $pgFilePath): void
{
    /** @psalm-suppress UndefinedMethod */
    $dbh->pgsqlCopyFromFile("oem.osmdata", $pgFilePath, "\t", "\\\\N", 'osm_id,osm_geometry,osm_osm_type,osm_osm_id,osm_tags');
    $n_osmdata = $dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
    logProgress("Loaded $n_osmdata OSM elements into DB");
}

function loadOsmDataWithOsm2pgsql(PDO $dbh, string $host, int $port, string $dbname, string $user, string $password, string $filteredFilePath): void
{
    execAndCheck("PGPASSWORD='$password' osm2pgsql --host='$host' --port='$port' --database='$dbname' --user='$user' --hstore-all --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 '$filteredFilePath'");
    $n_point = $dbh->query("SELECT COUNT(*) FROM planet_osm_point")->fetchColumn();
    $n_line = $dbh->query("SELECT COUNT(*) FROM planet_osm_line")->fetchColumn();
    $n_polygon = $dbh->query("SELECT COUNT(*) FROM planet_osm_polygon")->fetchColumn();
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
    return $dbh->query(
        "SELECT NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='element_wikidata_cods')"
    )->fetchColumn();
}

function convertElementWikidataCods(PDO $dbh): void
{
    $n_wikidata_cods = $dbh->exec(
        "INSERT INTO oem.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_from_name_etymology, ew_from_subject, ew_from_wikidata)
        SELECT osm_id, UPPER(TRIM(wikidata_cod)), FALSE, FALSE, TRUE
        FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'wikidata',';') AS splitted(wikidata_cod)
        WHERE TRIM(wikidata_cod) ~* '^Q\d+$'
        UNION
        SELECT osm_id, UPPER(TRIM(subject_wikidata_cod)), FALSE, TRUE, FALSE
        FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'subject:wikidata',';') AS splitted(subject_wikidata_cod)
        WHERE TRIM(subject_wikidata_cod) ~* '^Q\d+$'
        UNION
        SELECT osm_id, UPPER(TRIM(name_etymology_wikidata_cod)), TRUE, FALSE, FALSE
        FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'name:etymology:wikidata',';') AS splitted(name_etymology_wikidata_cod)
        WHERE TRIM(name_etymology_wikidata_cod) ~* '^Q\d+$'"
    );
    logProgress("Converted $n_wikidata_cods wikidata codes");
}

function loadWikidataEntities(PDO $dbh): void
{
    $n_wd = $dbh->exec(
        "INSERT INTO oem.wikidata (wd_wikidata_cod)
        SELECT DISTINCT ew_wikidata_cod
        FROM oem.element_wikidata_cods
        LEFT JOIN oem.wikidata ON wd_wikidata_cod = ew_wikidata_cod
        WHERE (ew_from_name_etymology OR ew_from_subject)
        AND wd_id IS NULL"
    );
    logProgress("Loaded $n_wd Wikidata entities");
}

function loadWikidataRelatedEntities(
    string $wikidataCodsFilter,
    string $relationName,
    string $relationProps,
    string $elementFilter,
    PDO $dbh,
    string $wikidataEndpointURL
): void {
    $wikidataRqFile = sys_get_temp_dir() . "/wikidata_$relationName.tmp.rq";
    $wikidataJSONFile = sys_get_temp_dir() . "/wikidata_$relationName.tmp.json";

    $n_todo = $dbh->query(
        "SELECT COUNT(DISTINCT ew_wikidata_cod)
        FROM oem.element_wikidata_cods
        WHERE $wikidataCodsFilter"
    )->fetchColumn();
    logProgress("Counted $n_todo Wikidata codes to check");

    if (!empty($elementFilter))
        $elementFilter = "; $elementFilter";

    $pageSize = 15000;
    for ($offset = 0; $offset < $n_todo; $offset += $pageSize) {
        logProgress("Downloading Wikidata \"$relationName\" data (starting from $offset)...");
        $wikidataCodsToFetch = $dbh->query(
            "SELECT STRING_AGG('wd:'||ew_wikidata_cod, ' ') FROM (
                SELECT DISTINCT ew_wikidata_cod
                FROM oem.element_wikidata_cods
                WHERE $wikidataCodsFilter
                ORDER BY ew_wikidata_cod
                LIMIT $pageSize
                OFFSET $offset
            ) AS x"
        )->fetchColumn();
        $sparqlQuery =
            "SELECT ?element ?prop ?related
            WHERE {
                VALUES ?element { $wikidataCodsToFetch }.
                VALUES ?prop { $relationProps }.
                {
                    ?element ?prop ?related $elementFilter.
                } UNION {
                    ?element owl:sameAs [
                        ?prop ?related $elementFilter
                    ].
                }
            }";
        file_put_contents($wikidataRqFile, $sparqlQuery);
        $jsonResult = (new JSONWikidataQuery($sparqlQuery, $wikidataEndpointURL))->sendAndGetJSONResult()->getJSON();
        file_put_contents($wikidataJSONFile, $jsonResult);

        logProgress("Loading Wikidata \"$relationName\" data...");
        $sth_wd = $dbh->prepare(
            "INSERT INTO oem.wikidata (wd_wikidata_cod)
            SELECT DISTINCT REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
            FROM json_array_elements((:response::JSON)->'results'->'bindings')
            LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE LEFT(value->'element'->>'value', 31) = 'http://www.wikidata.org/entity/'
            AND wd_id IS NULL
            UNION
            SELECT DISTINCT REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
            FROM json_array_elements((:response::JSON)->'results'->'bindings')
            LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'related'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE LEFT(value->'related'->>'value', 31) = 'http://www.wikidata.org/entity/'
            AND wd_id IS NULL"
        );
        $sth_wd->bindValue('response', $jsonResult, PDO::PARAM_LOB);
        $sth_wd->execute();
        $n_wd = $sth_wd->rowCount();

        $sth_wna = $dbh->prepare(
            "INSERT INTO oem.wikidata_named_after (wna_wd_id, wna_named_after_wd_id, wna_from_prop_cod)
            SELECT DISTINCT w1.wd_id, w2.wd_id, REPLACE(value->'prop'->>'value', 'http://www.wikidata.org/prop/direct/', '')
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

function loadWikidataNamedAfterEntities(PDO $dbh, string $wikidataEndpointURL): void
{
    loadWikidataRelatedEntities(
        "ew_from_wikidata",
        "named_after",
        "wdt:P138 wdt:P825 wdt:P547",
        "",
        $dbh,
        $wikidataEndpointURL
    );
}

function loadWikidataConsistsOfEntities(PDO $dbh, string $wikidataEndpointURL): void
{
    loadWikidataRelatedEntities(
        "ew_from_name_etymology OR ew_from_subject",
        "consists_of",
        "wdt:P527",
        "wdt:P31 wd:Q14073567",
        $dbh,
        $wikidataEndpointURL
    );
}

function convertEtymologies(PDO $dbh): void
{
    $n_ety = $dbh->exec(
        "INSERT INTO oem.etymology (
            et_el_id,
            et_wd_id,
            et_from_osm,
            et_from_osm_el_id,
            et_from_wikidata,
            et_from_name_etymology,
            et_from_name_etymology_consists,
            et_from_subject,
            et_from_subject_consists,
            et_from_wikidata_named_after,
            et_from_wikidata_dedicated_to,
            et_from_wikidata_commemorates,
            et_from_wikidata_wd_id,
            et_from_wikidata_prop_cod
        ) SELECT
            ew_el_id,
            wd_id,
            BOOL_OR(wna_from_prop_cod IS NULL) AS from_osm,
            MIN(CASE WHEN wna_from_prop_cod IS NULL THEN ew_el_id ELSE NULL END) AS from_osm_el_id,
            BOOL_OR(wna_from_prop_cod IS NOT NULL) AS from_wikidata,
            BOOL_OR(ew_from_name_etymology AND wna_from_prop_cod IS NULL) AS from_name_etymology,
            BOOL_OR(ew_from_name_etymology AND wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527') AS from_name_etymology_consists,
            BOOL_OR(ew_from_subject AND wna_from_prop_cod IS NULL) AS from_subject,
            BOOL_OR(ew_from_subject AND wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527') AS from_subject_consists,
            BOOL_OR(ew_from_wikidata AND wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P138') AS from_wikidata_named_after,
            BOOL_OR(ew_from_wikidata AND wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P825') AS from_wikidata_dedicated_to,
            BOOL_OR(ew_from_wikidata AND wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P547') AS from_wikidata_commemorates,
            MIN(from_wd_id) AS from_wikidata_wd_id,
            MIN(wna_from_prop_cod) AS from_wikidata_prop_cod
        FROM (
            SELECT DISTINCT ew_el_id, wd_id, ew_from_name_etymology, ew_from_subject, ew_from_wikidata, NULL::BIGINT AS from_wd_id, NULL::VARCHAR AS wna_from_prop_cod
            FROM oem.element_wikidata_cods
            JOIN oem.wikidata ON ew_wikidata_cod = wd_wikidata_cod
            WHERE ew_from_name_etymology OR ew_from_subject
            UNION
            SELECT DISTINCT ew.ew_el_id, nawd.wd_id, ew_from_name_etymology, ew_from_subject, ew_from_wikidata, wd.wd_id AS from_wd_id, wna_from_prop_cod
            FROM oem.element_wikidata_cods AS ew
            JOIN oem.wikidata AS wd ON ew.ew_wikidata_cod = wd.wd_wikidata_cod
            JOIN oem.wikidata_named_after AS wna ON wd.wd_id = wna.wna_wd_id
            JOIN oem.wikidata AS nawd ON wna.wna_named_after_wd_id = nawd.wd_id
        ) AS x
        GROUP BY ew_el_id, wd_id"
    );
    logProgress("Converted $n_ety etymologies");
}





if (!is_file("osmium.json")) {
    echo "ERROR: missing osmium.json" . PHP_EOL;
    exit(1);
}

$filteredFilePath = sys_get_temp_dir() . "/filtered_$sourceFileName";
$cacheFilePath = sys_get_temp_dir() . "/osmium_$sourceFileHash";

$txtFilePath = "$workDir/$sourceFileName.txt";
if (is_file($txtFilePath)) {
    logProgress('Data already exported to text');
} elseif ($convert_to_txt) {
    filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath);
    logProgress('Exporting OSM data to text...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$txtFilePath' -f 'txt' --config='osmium.json' --add-unique-id='counter' --index-type=sparse_file_array,$cacheFilePath '$filteredFilePath'");
    logProgress('Exported OSM data to text');
}

$geojsonFilePath = "$workDir/$sourceFileName.geojson";
if (is_file($geojsonFilePath)) {
    logProgress('Data already exported to geojson');
} elseif ($convert_to_geojson) {
    filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath);
    logProgress('Exporting OSM data to geojson...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$geojsonFilePath' -f 'geojson' --config='osmium.json' --add-unique-id='counter' --index-type=sparse_file_array,$cacheFilePath '$filteredFilePath'");
    logProgress('Exported OSM data to geojson');
}

$pgFilePath = "$workDir/$sourceFileName.pg";
if (is_file($pgFilePath)) {
    logProgress('Data already exported to PostGIS tsv');
} elseif ($convert_to_pg) {
    filterInputData($sourceFilePath, $sourceFileName, $filteredFilePath);
    logProgress('Exporting OSM data to PostGIS tsv...');
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$pgFilePath' -f 'pg' --config='osmium.json' --add-unique-id='counter' --index-type=sparse_file_array,$cacheFilePath '$filteredFilePath'");
    logProgress('Exported OSM data to PostGIS tsv');
}


if ($use_db) {
    try {
        $globalMapFilePath = __DIR__ . '/global-map.geojson';

        $conf = new IniFileConfiguration();
        $host = (string)$conf->get("db-host");
        $port = (int)$conf->get("db-port");
        $dbname = (string)$conf->get("db-database");
        $user = (string)$conf->get("db-user");
        $password = (string)$conf->get("db-password");

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
            $dbh->exec("DROP SCHEMA IF EXISTS oem CASCADE");
            if (is_file($globalMapFilePath))
                unlink($globalMapFilePath);
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
                logProgress('Loading Wikidata etymology entities...');
                loadWikidataEntities($dbh);

                $wikidataEndpointURL = (string)$conf->get("wikidata-endpoint");
                logProgress('Loading Wikidata "consists of" entities...');
                loadWikidataConsistsOfEntities($dbh, $wikidataEndpointURL);

                logProgress('Loading Wikidata "named after" entities...');
                loadWikidataNamedAfterEntities($dbh, $wikidataEndpointURL);
            }

            if ($dbh->query("SELECT EXISTS (SELECT FROM oem.etymology)")->fetchColumn()) {
                logProgress('Etymologies already loaded');
            } else {
                logProgress('Converting etymologies...');
                convertEtymologies($dbh);

                if (!$keep_temp_tables) {
                    $dbh->exec("DROP TABLE oem.element_wikidata_cods");
                    logProgress('Removed element_wikidata_cods temporary table');
                }
            }

            echo 'Conversion complete at ' . date('c') . PHP_EOL;
        }

        if (isOsmDataTemporaryTableAbsent($dbh)) {
            logProgress('Temporary tables already deleted, not cleaning up elements');
        } else {
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
                    el_commons,
                    el_wikipedia
                ) SELECT 
                    osm_id,
                    osm_geometry,
                    osm_osm_type,
                    osm_osm_id,
                    osm_tags,
                    SUBSTRING(osm_tags->>'wikimedia_commons' FROM '^([^;]+)'),
                    SUBSTRING(osm_tags->>'wikipedia' FROM '^([^;]+)')
                FROM oem.osmdata
                WHERE osm_id IN (SELECT DISTINCT et_el_id FROM oem.etymology)
                AND ST_Area(osm_geometry) < 0.01 -- Remove elements too big to be shown"
            );
            $n_cleaned = $n_tot - $n_remaining;
            logProgress("Cleaned up $n_cleaned elements without etymology ($n_remaining remaining)");

            $matches = [];
            if (preg_match('/-(\d{2})(\d{2})(\d{2})\./', $sourceFilePath, $matches) && count($matches) >= 4)
                $lastUpdate = '20' . $matches[1] . '-' . $matches[2] . '-' . $matches[3];
            else
                $lastUpdate = date('Y-m-d');
            file_put_contents('LAST_UPDATE', $lastUpdate);
            if (!$keep_temp_tables)
                $dbh->exec('DROP TABLE oem.osmdata');
        }

        if (is_file($globalMapFilePath)) {
            logProgress('Global map already generated');
        } else {
            logProgress('Generating global map...');
            $sth_global_map = $dbh->query(
                "SELECT JSON_BUILD_OBJECT(
                    'type', 'FeatureCollection',
                    'features', JSON_AGG(ST_AsGeoJSON(point.*)::json)
                )
                FROM (
                    SELECT
                        ST_SetSRID( ST_Point( ROUND(ST_X(ST_Centroid(el_geometry))::NUMERIC,2), ROUND(ST_Y(ST_Centroid(el_geometry))::NUMERIC,2)), 4326) AS geom,
                        COUNT(DISTINCT COALESCE(el_tags->>'name', el_id::TEXT)) AS el_num
                    FROM oem.etymology
                    JOIN oem.element ON et_el_id = el_id
                    GROUP BY ROUND(ST_X(ST_Centroid(el_geometry))::NUMERIC,2), ROUND(ST_Y(ST_Centroid(el_geometry))::NUMERIC,2)
                ) AS point"
            );
            file_put_contents($globalMapFilePath, (string)$sth_global_map->fetchColumn());
            logProgress('Generated global map...');
        }

        $backupFilePath = "$workDir/$sourceFileName.backup";
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
