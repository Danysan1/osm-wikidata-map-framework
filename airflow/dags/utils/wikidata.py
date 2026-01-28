"""
Load linked entity relationships from Wikidata

* load into the `osmdata` table of the local PostGIS DB all the Wikidata entities with a location and the configured direct properties which do not already exist
* load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
* load into the `etymology` table of the local PostGIS DB the direct related relationships

Uses the Wikidata SPARQL query service.
"""

import json
import logging
import time
from os.path import abspath, dirname, isfile, join

import requests
from airflow.sdk import Variable

logger = logging.getLogger(__name__)

SLEEP_TIME_S = 10
SPARQL_ENDPOINT = "https://query-main.wikidata.org/sparql"
USER_AGENT = "OSM-Wikidata-Map-Framework"

def read_query(filename: str) -> str:
    path = join(dirname(abspath(__file__)), "..", "sql", filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def read_json(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def save_json(path: str, content: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(content))

def fetch_sparql(query: str) -> dict:
    """Execute a SPARQL query against the Wikidata Query Service and return JSON results."""
    response = requests.post(
        SPARQL_ENDPOINT,
        data={"query": query},
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/sparql-results+json",
        },
        timeout=300,
    )
    response.raise_for_status()
    return response.json()

def load_page_on_db(cursor, json_str: str, wikidata_sql: str, element_update_sql: str, element_insert_sql: str, entities_sql: str) -> None:
    """Execute the four SQL statements for a single page of SPARQL results."""
    # wikidata.sql uses the JSON param twice (main SELECT + UNION)
    cursor.execute(wikidata_sql, {"json": json_str})
    logger.info("Loaded %s wikidata entities", cursor.rowcount)

    # element-update has no JSON parameter
    cursor.execute(element_update_sql)
    logger.info("Updated %s elements", cursor.rowcount)

    # element-insert uses the JSON param once
    cursor.execute(element_insert_sql, {"json": json_str})
    logger.info("Inserted %s elements", cursor.rowcount)

    # etymology uses the JSON param once
    cursor.execute(entities_sql, {"json": json_str})
    logger.info("Loaded %s etymology links", cursor.rowcount)

def fetch_direct_entities(workdir:str, wikidata_country: str | None = None) -> None:
    """
    Callable that downloads Wikidata direct related entities
    """

    # Read configuration
    properties = Variable.get("osm_wikidata_properties", deserialize_json=True)
    if not properties or not isinstance(properties, list):
        raise ValueError(f"Invalid osm_wikidata_properties variable: {properties}")

    # Read SPARQL template
    sparql_template = read_query("load-related-direct-map.sparql")

    # Build the SPARQL property values substitution
    direct_property_values = " ".join(f"(p:{p} ps:{p})" for p in properties)

    # Build country filter
    wikidata_country_query = f"?item wdt:P17 wd:{wikidata_country}." if wikidata_country else ""

    base_sparql = (
        sparql_template
        .replace("${directPropertyValues}", direct_property_values)
        .replace("${wikidataCountryQuery}", wikidata_country_query)
    )

    for page_number in range(10):
        json_path = join(workdir, f"{page_number}.json")
        if isfile(json_path):
            logger.info("Skipping page %d (already downloaded)", page_number)
            continue
                
        sparql_query = base_sparql.replace("${lastDigit}", str(page_number))
        logger.info("Fetching page %d...", page_number)

        try:
            result = fetch_sparql(sparql_query)
        except Exception:
            logger.warning("First attempt for page %d failed, retrying...", page_number, exc_info=True)
            time.sleep(SLEEP_TIME_S)
            result = fetch_sparql(sparql_query)

        bindings = result.get("results", {}).get("bindings", [])
        logger.info("Fetched %d rows for page %d", len(bindings), page_number)

        save_json(json_path, result)
        logger.info("Loaded page %d", page_number)
        time.sleep(SLEEP_TIME_S)

    logger.info("Done loading direct related entities")

def load_direct_entities(workdir:str, postgres_conn_id: str) -> None:
    """
    Callable that loads Wikidata entities into the local PostGIS DB.
    """
    from airflow.providers.postgres.hooks.postgres import PostgresHook

    # Read SQL templates
    wikidata_sql = read_query("load-related-wikidata.sql")
    element_update_sql = read_query("load-related-element-update.sql")
    element_insert_sql = read_query("load-related-element-insert.sql")
    entities_sql = read_query("load-related-direct-entities.sql")

    # Connect to DB and run as a single transaction
    pg_hook = PostgresHook(postgres_conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            for page_number in range(10):
                json_path = join(workdir, f"{page_number}.json")
                if not isfile(json_path):
                    raise Exception(f"Missing json file {json_path}")

                logger.info("Loading data from %s", json_path)                
                json_str = read_json(json_path)
                load_page_on_db(cursor, json_str, wikidata_sql, element_update_sql, element_insert_sql, entities_sql)
                logger.info("Loaded page %d", page_number)

        pg_conn.commit()

    logger.info("Done loading direct related entities")
