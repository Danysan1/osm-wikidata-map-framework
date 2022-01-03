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
$keep_temp_tables = in_array("--keep-temp-tables", $argv);

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

$sourceFile = realpath($argv[1]);
if (empty($sourceFile)) {
    echo "ERROR: Could not deduce full path for the given file: " . $argv[1] . PHP_EOL;
    exit(1);
} elseif (!is_file($sourceFile)) {
    echo "ERROR: The file you passed as first argument does not exist: " . $sourceFile . PHP_EOL;
    exit(1);
}
$workDir = dirname($sourceFile);
$sourceFilename = basename($sourceFile);
echo "Working on file $sourceFilename in directory $workDir" . PHP_EOL;

if ($keep_temp_tables)
    echo 'Keeping temporary tables' . PHP_EOL;

if (empty($argv[2]) || $argv[2] == "default") {
    echo 'Using osmium-export to pg (default)' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_pg = TRUE;
} elseif ($argv[2] == "txt") {
    echo 'Using osmium-export to txt' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_txt = TRUE;
} elseif ($argv[2] == "geojson") {
    echo 'Using osmium-export to geojson' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_geojson = TRUE;
} elseif ($argv[2] == "pg") {
    echo 'Using osmium-export to pg' . PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_pg = TRUE;
} elseif ($argv[2] == "osm2pgsql") {
    echo 'Using osm2pgsql' . PHP_EOL;
    exec("which osm2pgsql", $output, $retval);
    if ($retval !== 0) {
        echo "ERROR: osm2pgsql is not installed" . PHP_EOL;
        exit(1);
    }
    $use_osm2pgsql = TRUE;
} else {
    echo "ERROR: Bad argument" . PHP_EOL;
    exit(1);
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

$filteredTmpFile = "$workDir/filtered_with_flags_$sourceFilename";
$filteredFile = "$workDir/filtered_$sourceFilename";
if (is_file($filteredFile)) {
    echo '========================= Data already filtered =========================' . PHP_EOL;
} else {
    echo '========================= Filtering OSM data... =========================' . PHP_EOL;
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html
     */
    execAndCheck("osmium tags-filter --verbose --remove-tags --overwrite -o '$filteredTmpFile' '$sourceFile' 'wikidata,subject:wikidata,name:etymology:wikidata'");
    execAndCheck("osmium tags-filter --verbose --invert-match --overwrite -o '$filteredFile' '$filteredTmpFile' 'man_made=flagpole'");
    echo '========================= Filtered OSM data =========================' . PHP_EOL;
    
    if(is_file("/tmp/osmium.sparse.cache"))
        unlink("/tmp/osmium.sparse.cache");
}


if (!is_file("osmium.json")) {
    echo "ERROR: missing osmium.json" . PHP_EOL;
    exit(1);
}

$txtFile = "$workDir/filtered_$sourceFilename.txt";
if (is_file($txtFile)) {
    echo '========================= Data already exported to text =========================' . PHP_EOL;
} elseif ($convert_to_txt) {
    echo '========================= Exporting OSM data to text... =========================' . PHP_EOL;
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$txtFile' -f 'txt' --config='osmium.json' --add-unique-id='counter' --index-type=sparse_file_array,/tmp/osmium.sparse.cache '$filteredFile'");
    echo '========================= Exported OSM data to text =========================' . PHP_EOL;
}

$geojsonFile = "$workDir/filtered_$sourceFilename.geojson";
if (is_file($geojsonFile)) {
    echo '========================= Data already exported to geojson =========================' . PHP_EOL;
} elseif ($convert_to_geojson) {
    echo '========================= Exporting OSM data to geojson... =========================' . PHP_EOL;
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$geojsonFile' -f 'geojson' --config='osmium.json' --add-unique-id='counter' --index-type=sparse_file_array,/tmp/osmium.sparse.cache '$filteredFile'");
    echo '========================= Exported OSM data to geojson =========================' . PHP_EOL;
}

$pgFile = "$workDir/filtered_$sourceFilename.pg";
if (is_file($pgFile)) {
    echo '========================= Data already exported to PostGIS tsv =========================' . PHP_EOL;
} elseif ($convert_to_pg) {
    echo '========================= Exporting OSM data to PostGIS tsv... =========================' . PHP_EOL;
    /**
     * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
     */
    execAndCheck("osmium export --verbose --overwrite -o '$pgFile' -f 'pg' --config='osmium.json' --add-unique-id='counter' --index-type=sparse_file_array,/tmp/osmium.sparse.cache '$filteredFile'");
    echo '========================= Exported OSM data to PostGIS tsv =========================' . PHP_EOL;
}


if ($use_db) {
    try {
        $conf = new IniFileConfiguration();
        $dbh = new PostGIS_PDO($conf);

        $tries = 0;
        do {
            try {
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

        if ($dbh->query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='wikidata_text')")->fetchColumn()) {
            echo '========================= DB schema already prepared =========================' . PHP_EOL;
        } else {
            echo '========================= Preparing DB schema... =========================' . PHP_EOL;
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
                    el_name VARCHAR
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
                    ew_etymology BOOLEAN NOT NULL
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
            $dbh->exec(
                "CREATE TABLE oem.etymology (
                    --et_el_id BIGINT NOT NULL REFERENCES oem.element(el_id), -- element is populated only at the end
                    et_el_id BIGINT NOT NULL,
                    et_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
                    CONSTRAINT etymology_pkey PRIMARY KEY (et_el_id, et_wd_id)
                )"
            );
            $dbh->exec("CREATE INDEX etymology_el_id_idx ON oem.etymology (et_el_id) WITH (fillfactor='100')");
            $dbh->exec(
                "CREATE TABLE oem.wikidata_picture (
                    wdp_id SERIAL NOT NULL PRIMARY KEY,
                    wdp_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
                    wdp_picture VARCHAR NOT NULL
                )"
            );
            $dbh->exec("CREATE INDEX wikidata_picture_id_idx ON oem.wikidata_picture (wdp_wd_id) WITH (fillfactor='100')");
            $dbh->exec(
                "CREATE TABLE oem.wikidata_named_after (
                    wna_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
                    wna_named_after_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
                    CONSTRAINT wikidata_named_after_pkey PRIMARY KEY (wna_wd_id, wna_named_after_wd_id)
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
                    wdt_full_download_date TIMESTAMP DEFAULT NULL,
                    CONSTRAINT wikidata_text_unique_wikidata_language UNIQUE (wdt_wd_id, wdt_language)
                )"
            );
            $dbh->exec("CREATE INDEX wikidata_text_id_idx ON oem.wikidata_text (wdt_wd_id) WITH (fillfactor='100')");
            echo '========================= DB schema prepared =========================' . PHP_EOL;
        }

        if ($dbh->query("SELECT NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='osmdata')")->fetchColumn()) {
            echo '========================= Temporary tables already deleted, not loading elements =========================' . PHP_EOL;
        } elseif ($dbh->query("SELECT EXISTS (SELECT FROM oem.osmdata)")->fetchColumn()) {
            echo '========================= Elements already loaded =========================' . PHP_EOL;
        } else {
            if ($convert_to_pg) {
                echo '========================= Loading OSM elements into DB... =========================' . PHP_EOL;
                /** @psalm-suppress UndefinedMethod */
                $dbh->pgsqlCopyFromFile("oem.osmdata", $pgFile, "\t", "\\\\N", 'osm_id,osm_geometry,osm_osm_type,osm_osm_id,osm_tags');
                $n_osmdata = $dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
                echo "========================= Loaded $n_osmdata OSM elements into DB =========================" . PHP_EOL;
            } else { // use_osm2pgsql
                $host = (string)$conf->get("db-host");
                $port = (int)$conf->get("db-port");
                $dbname = (string)$conf->get("db-database");
                $user = (string)$conf->get("db-user");
                $password = (string)$conf->get("db-password");
                echo '========================= Loading data into DB... =========================' . PHP_EOL;
                execAndCheck("PGPASSWORD='$password' osm2pgsql --host='$host' --port='$port' --database='$dbname' --user='$user' --hstore-all --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 '$filteredFile'");
                $n_point = $dbh->query("SELECT COUNT(*) FROM planet_osm_point")->fetchColumn();
                $n_line = $dbh->query("SELECT COUNT(*) FROM planet_osm_line")->fetchColumn();
                $n_polygon = $dbh->query("SELECT COUNT(*) FROM planet_osm_polygon")->fetchColumn();
                echo "========================= Data loaded into DB ($n_point points, $n_line lines, $n_polygon polygons) =========================" . PHP_EOL;

                echo '========================= Converting elements... =========================' . PHP_EOL;
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
                echo "========================= Converted $n_element elements =========================" . PHP_EOL;
            }

            echo 'Loading complete at ' . date('c') . PHP_EOL;
        }

        if ($dbh->query("SELECT NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='element_wikidata_cods')")->fetchColumn()) {
            echo '========================= Temporary tables already deleted, not loading wikidata entities end etymologies =========================' . PHP_EOL;
        } else {
            if ($dbh->query("SELECT EXISTS (SELECT FROM oem.element_wikidata_cods)")->fetchColumn()) {
                echo '========================= Wikidata codes already converted =========================' . PHP_EOL;
            } else {
                echo '========================= Converting wikidata codes... =========================' . PHP_EOL;
                $n_wikidata_cods = $dbh->exec(
                    "INSERT INTO oem.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_etymology)
                    SELECT osm_id, UPPER(TRIM(wikidata_cod)), FALSE
                    FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'wikidata',';') AS splitted(wikidata_cod)
                    WHERE TRIM(wikidata_cod) ~* '^Q\d+$'
                    UNION
                    SELECT osm_id, UPPER(TRIM(subject_wikidata_cod)), TRUE
                    FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'subject:wikidata',';') AS splitted(subject_wikidata_cod)
                    WHERE TRIM(subject_wikidata_cod) ~* '^Q\d+$'
                    UNION
                    SELECT osm_id, UPPER(TRIM(name_etymology_wikidata_cod)), TRUE
                    FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'name:etymology:wikidata',';') AS splitted(name_etymology_wikidata_cod)
                    WHERE TRIM(name_etymology_wikidata_cod) ~* '^Q\d+$'"
                );
                echo "========================= Converted $n_wikidata_cods wikidata codes =========================" . PHP_EOL;
            }

            if ($dbh->query("SELECT EXISTS (SELECT FROM oem.wikidata)")->fetchColumn()) {
                echo '========================= Wikidata entities already loaded =========================' . PHP_EOL;
            } else {
                $wikidataEndpointURL = (string)$conf->get("wikidata-endpoint");

                $wikidataNamedAfterRQFile = "$workDir/wikidata_named_after.tmp.rq";
                $wikidataNamedAfterJSONFile = "$workDir/wikidata_named_after.tmp.json";

                $n_todo_named_after = $dbh->query(
                    "SELECT COUNT(DISTINCT ew_wikidata_cod) FROM oem.element_wikidata_cods WHERE NOT ew_etymology"
                )->fetchColumn();
                echo "========================= Counted $n_todo_named_after Wikidata codes to check =========================" . PHP_EOL;

                $pageSize = 10000;
                for ($offset = 0; $offset < $n_todo_named_after; $offset += $pageSize) {
                    echo "========================= Downloading Wikidata named-after data (starting from $offset)... =========================" . PHP_EOL;
                    $wikidataCodsToFetch = $dbh->query(
                        "SELECT STRING_AGG('wd:'||ew_wikidata_cod, ' ') FROM (
                            SELECT DISTINCT ew_wikidata_cod FROM oem.element_wikidata_cods WHERE NOT ew_etymology ORDER BY ew_wikidata_cod LIMIT $pageSize OFFSET $offset
                        ) AS x"
                    )->fetchColumn();
                    $namedAfterQuery =
                        "SELECT ?element ?namedAfter
                        WHERE {
                            VALUES ?element { $wikidataCodsToFetch }.
                            {
                                ?element wdt:P138 ?namedAfter.
                            } UNION {
                                ?element owl:sameAs/wdt:P138 ?namedAfter.
                            }
                        }";
                    file_put_contents($wikidataNamedAfterRQFile, $namedAfterQuery);
                    $jsonResult = (new JSONWikidataQuery($namedAfterQuery, $wikidataEndpointURL))->sendAndGetJSONResult()->getJSON();
                    file_put_contents($wikidataNamedAfterJSONFile, $jsonResult);

                    echo '========================= Loading Wikidata named-after data... =========================' . PHP_EOL;
                    $sth_wd = $dbh->prepare(
                        "INSERT INTO oem.wikidata (wd_wikidata_cod)
                        SELECT DISTINCT REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
                        FROM json_array_elements((:response::JSON)->'results'->'bindings')
                        LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
                        WHERE LEFT(value->'element'->>'value', 31) = 'http://www.wikidata.org/entity/'
                        AND wd_id IS NULL
                        UNION
                        SELECT DISTINCT REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
                        FROM json_array_elements((:response::JSON)->'results'->'bindings')
                        LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
                        WHERE LEFT(value->'namedAfter'->>'value', 31) = 'http://www.wikidata.org/entity/'
                        AND wd_id IS NULL"
                    );
                    $sth_wd->bindValue('response', $jsonResult, PDO::PARAM_LOB);
                    $sth_wd->execute();
                    $n_wd = $sth_wd->rowCount();

                    $sth_wna = $dbh->prepare(
                        "INSERT INTO oem.wikidata_named_after (wna_wd_id, wna_named_after_wd_id)
                        SELECT DISTINCT w1.wd_id, w2.wd_id
                        FROM json_array_elements((:response::JSON)->'results'->'bindings')
                        JOIN oem.wikidata AS w1 ON w1.wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
                        JOIN oem.wikidata AS w2 ON w2.wd_wikidata_cod = REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
                        WHERE LEFT(value->'namedAfter'->>'value', 31) = 'http://www.wikidata.org/entity/'"
                    );
                    $sth_wna->bindValue('response', $jsonResult, PDO::PARAM_LOB);
                    $sth_wna->execute();
                    $n_wna = $sth_wna->rowCount();
                    echo "========================= Loaded $n_wd Wikidata entities and $n_wna named-after associations =========================" . PHP_EOL;
                }

                echo "========================= Loading Wikidata etymology entities... =========================" . PHP_EOL;
                $n_wd = $dbh->exec(
                    "INSERT INTO oem.wikidata (wd_wikidata_cod)
                    SELECT DISTINCT ew_wikidata_cod
                    FROM oem.element_wikidata_cods
                    LEFT JOIN oem.wikidata ON wd_wikidata_cod = ew_wikidata_cod
                    WHERE ew_etymology
                    AND wd_id IS NULL"
                );
                echo "========================= Loaded $n_wd Wikidata entities =========================" . PHP_EOL;

                // Possibly in the future: brothers => ?element wdt:P31 wd:Q14073567; wdt:P527 ?namedAfter;
            }

            if ($dbh->query("SELECT EXISTS (SELECT FROM oem.etymology)")->fetchColumn()) {
                echo '========================= Etymologies already loaded =========================' . PHP_EOL;
            } else {
                echo '========================= Converting etymologies... =========================' . PHP_EOL;
                $n_ety = $dbh->exec(
                    "INSERT INTO oem.etymology (et_el_id, et_wd_id)
                    SELECT DISTINCT ew_el_id, wd_id
                    FROM oem.element_wikidata_cods
                    JOIN oem.wikidata ON ew_wikidata_cod = wd_wikidata_cod
                    WHERE ew_etymology
                    UNION
                    SELECT DISTINCT ew.ew_el_id, nawd.wd_id
                    FROM oem.element_wikidata_cods AS ew
                    JOIN oem.wikidata AS wd ON ew.ew_wikidata_cod = wd.wd_wikidata_cod
                    JOIN oem.wikidata_named_after AS wna ON wd.wd_id = wna.wna_wd_id
                    JOIN oem.wikidata AS nawd ON wna.wna_named_after_wd_id = nawd.wd_id
                    WHERE NOT ew.ew_etymology"
                );
                if (!$keep_temp_tables)
                    $dbh->exec("DROP TABLE oem.element_wikidata_cods");
                echo "========================= Converted $n_ety etymologies =========================" . PHP_EOL;
            }

            echo 'Conversion complete at ' . date('c') . PHP_EOL;
        }

        if ($dbh->query("SELECT NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='oem' AND table_name='osmdata')")->fetchColumn()) {
            echo '========================= Temporary tables already deleted, not cleaning up elements =========================' . PHP_EOL;
        } else {
            echo '========================= Cleaning up elements without etymology... =========================' . PHP_EOL;
            $n_tot = (int)$dbh->query("SELECT COUNT(*) FROM oem.osmdata")->fetchColumn();
            /*$n_cleaned = $dbh->exec(
                "DELETE FROM oem.osmdata WHERE osm_id NOT IN (SELECT DISTINCT et_el_id FROM oem.etymology)"
            );
            $n_remaining = $n_tot - $n_cleaned;
            $dbh->exec('ALTER TABLE oem.osmdata RENAME TO element');*/
            // Almost 90% of elements would be deleted, it's faster to copy them in another table; https://stackoverflow.com/a/7088514/2347196
            $n_remaining = $dbh->exec(
                "INSERT INTO oem.element (el_id, el_geometry, el_osm_type, el_osm_id, el_name)
                SELECT osm_id, osm_geometry, osm_osm_type, osm_osm_id, osm_tags->>'name'
                FROM oem.osmdata
                WHERE osm_id IN (SELECT DISTINCT et_el_id FROM oem.etymology)"
            );
            $n_cleaned = $n_tot - $n_remaining;
            echo "========================= Cleaned up $n_cleaned elements without etymology ($n_remaining remaining) =========================" . PHP_EOL;
            if (!$keep_temp_tables)
                $dbh->exec('DROP TABLE oem.osmdata');
        }

        echo '========================= Generating global map... =========================' . PHP_EOL;
        $sth_global_map = $dbh->query(
            "SELECT JSON_BUILD_OBJECT(
                'type', 'FeatureCollection',
                'features', JSON_AGG(ST_AsGeoJSON(point.*)::json)
            )
            FROM (
                SELECT
                    ST_SetSRID( ST_Point( ROUND(ST_X(ST_Centroid(el_geometry))::NUMERIC,2), ROUND(ST_Y(ST_Centroid(el_geometry))::NUMERIC,2)), 4326) AS geom,
                    COUNT(DISTINCT et_el_id) AS num
                FROM oem.etymology
                JOIN oem.element ON et_el_id = el_id
                WHERE ST_Area(el_geometry) < 0.01
                GROUP BY ROUND(ST_X(ST_Centroid(el_geometry))::NUMERIC,2), ROUND(ST_Y(ST_Centroid(el_geometry))::NUMERIC,2)
            ) AS point"
        );
        file_put_contents(__DIR__ . '/global-map.geojson', (string)$sth_global_map->fetchColumn());
        echo '========================= Generated global map... =========================' . PHP_EOL;

        //echo '========================= Generating backup... =========================' . PHP_EOL;
        //execAndCheck("PGPASSWORD='$password' pg_dump --file 'open-etymology-map.backup' --host '$host' --port '$port' --database='$dbname' --username '$user' --no-password --verbose --format=c --blobs --no-owner --section=pre-data --section=data --section=post-data --no-privileges --no-tablespaces --no-unlogged-table-data --schema 'public' 'oem'")
        //echo '========================= Backup generated... =========================' . PHP_EOL;
    } catch (Exception $e) {
        echo "ERROR:" . PHP_EOL . $e->getMessage() . PHP_EOL;
    }

    echo 'Finished at ' . date('c') . PHP_EOL;
}
