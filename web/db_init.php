<?php

use App\IniFileConfiguration;
use App\PostGIS_PDO;

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

exec("which osmium", $output, $retval);
if ($retval !== 0) {
    echo "ERROR: osmium is not installed".PHP_EOL;
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
    echo "ERROR: You must pass as first argument the name of the .pbf input extract".PHP_EOL;
    exit(1);
}

$sourceFile = realpath($argv[1]);
if (empty($sourceFile)) {
    echo "ERROR: Could not deduce full path for the given file: " . $argv[1].PHP_EOL;
    exit(1);
} elseif (!is_file($sourceFile)) {
    echo "ERROR: The file you passed as first argument does not exist: " . $sourceFile.PHP_EOL;
    exit(1);
}
$workDir = dirname($sourceFile);
$sourceFilename = basename($sourceFile);
echo "Working on file $sourceFilename in directory $workDir".PHP_EOL;

if (empty($argv[2])) {
    echo 'Using osmium-export to pg (default)'.PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_pg = TRUE;
} elseif ($argv[2] == "txt") {
    echo 'Using osmium-export to txt'.PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_txt = TRUE;
} elseif ($argv[2] == "geojson") {
    echo 'Using osmium-export to geojson'.PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_geojson = TRUE;
} elseif ($argv[2] == "pg") {
    echo 'Using osmium-export to pg'.PHP_EOL;
    $use_osmium_export = TRUE;
    $convert_to_pg = TRUE;
} elseif ($argv[2] == "osm2pgsql") {
    echo 'Using osm2pgsql'.PHP_EOL;
    if (exec("which osm2pgsql", $output, $retval)) {
        echo "ERROR: osm2pgsql is not installed".PHP_EOL;
        exit(1);
    }
    $use_osm2pgsql = TRUE;
} else {
    echo "ERROR: Bad argument".PHP_EOL;
    exit(1);
}
$use_db = $use_osm2pgsql || $convert_to_pg;

function execAndCheck(string $command): array
{
    $exRetval = 1;
    $exOutput = null;
    exec($command, $exOutput, $exRetval);
    echo implode(PHP_EOL, array_map(function ($str) {
        return empty($str) ? '' : "    $str";
    }, $exOutput));
    if ($exRetval !== 0) {
        echo 'ERROR: command execution failed'.PHP_EOL;
        exit(1);
    }
    return $exOutput;
}

/**
 * @link https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html
 */

$filteredFile = "$workDir/filtered_$sourceFilename";
if (is_file($filteredFile)) {
    echo '========================= Data already filtered ========================='.PHP_EOL;
} else {
    echo '========================= Filtering OSM data... ========================='.PHP_EOL;
    execAndCheck("osmium tags-filter --verbose --remove-tags --overwrite -o '$filteredFile' '$sourceFile' 'name:etymology:wikidata,subject:wikidata,wikidata'");
    echo '========================= Filtered OSM data ========================='.PHP_EOL;
}

/**
 * @link https://docs.osmcode.org/osmium/latest/osmium-export.html
 */

if(!is_file("osmium.json")){
    echo "ERROR: missing osmium.json".PHP_EOL;
    exit(1);
}

$txtFile = "$workDir/filtered_$sourceFilename.txt";
if (is_file($txtFile)) {
    echo '========================= Data already exported to text ========================='.PHP_EOL;
} elseif ($convert_to_txt) {
    echo '========================= Exporting OSM data to text... ========================='.PHP_EOL;
    execAndCheck("osmium export --verbose --overwrite -o '$txtFile' -f 'txt' --config='osmium.json' --add-unique-id='counter' --index-type=dense_file_array,/tmp/osmium-nodes.cache '$filteredFile'");
    echo '========================= Exported OSM data to text ========================='.PHP_EOL;
}

$geojsonFile = "$workDir/filtered_$sourceFilename.geojson";
if (is_file($geojsonFile)) {
    echo '========================= Data already exported to geojson ========================='.PHP_EOL;
} elseif ($convert_to_geojson) {
    echo '========================= Exporting OSM data to geojson... ========================='.PHP_EOL;
    execAndCheck("osmium export --verbose --overwrite -o '$geojsonFile' -f 'geojson' --config='osmium.json' --add-unique-id='counter' --index-type=dense_file_array,/tmp/osmium-nodes.cache '$filteredFile'");
    echo '========================= Exported OSM data to geojson ========================='.PHP_EOL;
}

$pgFile = "$workDir/filtered_$sourceFilename.pg";
if (is_file($pgFile)) {
    echo '========================= Data already exported to PostGIS tsv ========================='.PHP_EOL;
} elseif ($convert_to_pg) {
    echo '========================= Exporting OSM data to PostGIS tsv... ========================='.PHP_EOL;
    execAndCheck("osmium export --verbose --overwrite -o '$pgFile' -f 'pg' --config='osmium.json' --add-unique-id='counter' --index-type=dense_file_array,/tmp/osmium-nodes.cache '$filteredFile'");
    echo '========================= Exported OSM data to PostGIS tsv ========================='.PHP_EOL;
}


if ($use_db) {
    try {
        require_once("./app/IniFileConfiguration.php");
        require_once("./app/PostGIS_PDO.php");
        $dbh = new PostGIS_PDO(new IniFileConfiguration());

        $tries = 0;
        do {
            try {
                $dbh->query('SELECT version()');
                $failure = false;
            } catch (Exception $e) {
                $tries += 1;
                if ($tries == 60) {
                    echo "ERROR: max connection tries reached, could not connect to PostgreSQL database".PHP_EOL;
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
        $dbh->exec("CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder");
        $dbh->exec("CREATE EXTENSION IF NOT EXISTS postgis_topology");
        $dbh->exec("CREATE EXTENSION IF NOT EXISTS hstore");

        try {
            $dbh->query("SELECT PostGIS_Version()");
        } catch (Exception $e) {
            echo 'ERROR: PostGIS is required, it is not installed on the DB and initialization failed: ' . $e->getMessage();
            exit(1);
        }

        if ($dbh->query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='wikidata_text')")->fetchColumn()) {
            echo '========================= DB schema already prepared ========================='.PHP_EOL;
        } else {
            echo '========================= Preparing DB schema ========================='.PHP_EOL;
            $dbh->exec('DROP TABLE IF EXISTS "wikidata_text"');
            $dbh->exec('DROP TABLE IF EXISTS "wikidata_picture"');
            $dbh->exec('DROP TABLE IF EXISTS "etymology"');
            $dbh->exec('DROP TABLE IF EXISTS "wikidata_named_after"');
            $dbh->exec('DROP TABLE IF EXISTS "wikidata"');
            $dbh->exec('DROP TABLE IF EXISTS "element_wikidata_cods"');
            $dbh->exec('DROP TABLE IF EXISTS "element"');
            $dbh->exec('DROP FUNCTION IF EXISTS translateTimestamp');
            $dbh->exec(
                "CREATE FUNCTION translateTimestamp(IN text TEXT)
                    RETURNS timestamp without time zone
                    LANGUAGE 'sql' AS \$BODY$
                SELECT CASE
                    WHEN $1 IS NULL THEN NULL
                    WHEN LEFT($1,1)='-' THEN CONCAT(SUBSTRING($1,2),' BC')::TIMESTAMP
                    ELSE $1::TIMESTAMP
                END;
                \$BODY$;"
            );
            $dbh->exec(
                "CREATE TABLE \"element\" (
                el_id BIGSERIAL NOT NULL PRIMARY KEY,
                el_geometry GEOMETRY NOT NULL,
                el_osm_type VARCHAR(8) NOT NULL CHECK (el_osm_type IN ('node','way','relation')),
                el_osm_id BIGINT NOT NULL,
                el_name VARCHAR,
                el_wikidata VARCHAR,
                el_subject_wikidata VARCHAR,
                el_name_etymology_wikidata VARCHAR
                --CONSTRAINT element_unique_osm_id UNIQUE (el_osm_type, el_osm_id) --! causes errors with osm2pgsql as it creates duplicates, see https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
                )"
            );
            $dbh->exec("CREATE UNIQUE INDEX element_id_idx ON element (el_id) WITH (fillfactor='100')");
            $dbh->exec("CREATE INDEX element_geometry_idx ON element USING GIST (el_geometry) WITH (fillfactor='100')");
            $dbh->exec(
                "CREATE TABLE element_wikidata_cods (
                ew_id BIGSERIAL NOT NULL PRIMARY KEY,
                ew_el_id BIGINT NOT NULL,
                ew_wikidata_cod VARCHAR(12) NOT NULL CHECK (LEFT(ew_wikidata_cod,1) = 'Q'),
                ew_etymology BOOLEAN NOT NULL
                )"
            );
            $dbh->exec(
                "CREATE TABLE wikidata (
                    wd_id SERIAL NOT NULL PRIMARY KEY,
                    wd_wikidata_cod VARCHAR(12) NOT NULL UNIQUE CHECK (LEFT(wd_wikidata_cod,1) = 'Q'),
                    wd_position GEOMETRY,
                    --wd_event_date TIMESTAMP,
                    wd_event_date VARCHAR,
                    wd_event_date_precision INT,
                    --wd_start_date TIMESTAMP,
                    wd_start_date VARCHAR,
                    wd_start_date_precision INT,
                    --wd_end_date TIMESTAMP,
                    wd_end_date VARCHAR,
                    wd_end_date_precision INT,
                    --wd_birth_date TIMESTAMP,
                    wd_birth_date VARCHAR,
                    wd_birth_date_precision INT,
                    --wd_death_date TIMESTAMP,
                    wd_death_date VARCHAR,
                    wd_death_date_precision INT,
                    wd_commons VARCHAR,
                    wd_gender_id INT REFERENCES wikidata(wd_id),
                    wd_instance_id INT REFERENCES wikidata(wd_id),
                    wd_download_date TIMESTAMP DEFAULT NULL
                )"
            );
            $dbh->exec("CREATE UNIQUE INDEX wikidata_id_idx ON wikidata (wd_id) WITH (fillfactor='100')");
            $dbh->exec(
                "CREATE TABLE etymology (
                    et_el_id BIGINT NOT NULL REFERENCES element(el_id),
                    et_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
                    CONSTRAINT etymology_pkey PRIMARY KEY (et_el_id, et_wd_id)
                )"
            );
            $dbh->exec("CREATE INDEX etymology_el_id_idx ON etymology (et_el_id) WITH (fillfactor='100')");
            $dbh->exec(
                "CREATE TABLE wikidata_picture (
                    wdp_id SERIAL NOT NULL PRIMARY KEY,
                    wdp_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
                    wdp_picture VARCHAR NOT NULL
                )"
            );
            $dbh->exec("CREATE INDEX wikidata_picture_id_idx ON wikidata_picture (wdp_wd_id) WITH (fillfactor='100')");
            $dbh->exec(
                "CREATE TABLE wikidata_named_after (
                    wna_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
                    wna_named_after_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
                    CONSTRAINT wikidata_named_after_pkey PRIMARY KEY (wna_wd_id, wna_named_after_wd_id)
                )"
            );
            $dbh->exec(
                "CREATE TABLE wikidata_text (
                    wdt_id SERIAL NOT NULL PRIMARY KEY,
                    wdt_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
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
                    wdt_download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT wikidata_text_unique_wikidata_language UNIQUE (wdt_wd_id, wdt_language)
                )"
            );
            $dbh->exec("CREATE INDEX wikidata_text_id_idx ON wikidata_text (wdt_wd_id) WITH (fillfactor='100')");
        }

        if ($convert_to_pg) {
            if ($dbh->query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='osmdata')")->fetchColumn()) {
                echo '========================= Table "osmdata" already set up ========================='.PHP_EOL;
            } else {
                echo '========================= Setting up table "osmdata" ========================='.PHP_EOL;
                $dbh->exec(
                    'CREATE TABLE "osmdata" (
                  "id" BIGINT NOT NULL PRIMARY KEY,
                  "geom" GEOMETRY NOT NULL,
                  "osm_type" TEXT NOT NULL,
                  "osm_id" BIGINT NOT NULL,
                  "tags" JSONB
                )'
                );
                echo '========================= Table "osmdata" set up ========================='.PHP_EOL;
            }

            if ($dbh->query("SELECT EXISTS (SELECT FROM osmdata)")->fetchColumn()) {
                echo '========================= Data already loaded into DB ========================='.PHP_EOL;
            } else {
                echo '========================= Loading data into DB ========================='.PHP_EOL;
                $dbh->pgsqlCopyFromFile("osmdata", $pgFile);
                echo '========================= Data loaded into DB ========================='.PHP_EOL;
            }
        } else { // use_osm2pgsql
            // TODO
        }
    } catch (Exception $e) {
        echo "ERROR:" . PHP_EOL . $e->getMessage().PHP_EOL;
    }
}
