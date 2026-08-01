"""
Fetch linked entity relationships from Wikidata.

Two download methods are available (see `OwmfDownloadWikidataDAG`):
* DuckDB (default, faster and more reliable): query the periodic GeoParquet dump published at
  https://wikidata-geo-dumps.toolforge.org/ (see `utils.wikidata_duckdb`)
* SPARQL (legacy): query the Wikidata Query Service directly

Whichever method is used, the downloaded data is normalized into a common CSV format (one row per
item/property/linked-entity triple, see `ENTITY_LINK_CSV_COLUMNS`) so that `OwmfDbInitDAG` can load it
into the local PostGIS DB with a plain `COPY`, without needing to know how it was fetched.
"""

import csv
from os.path import abspath, dirname, join

import requests

SPARQL_ENDPOINT = "https://query-main.wikidata.org/sparql"
USER_AGENT = "OSM-Wikidata-Map-Framework"

WIKIDATA_GEO_DUMPS_INDEX_URL = "https://wikidata-geo-dumps.toolforge.org/dumps/index.json"
WIKIDATA_GEO_DUMPS_PARQUET_NAME = "wikidata_geo.parquet"

# Common CSV format shared by every Wikidata entities download method: one row per
# (item, property, linked entity) triple. Columns with a bare Wikidata Q-ID/P-ID (item_qid,
# linked_entity_qid, from_prop_pid, alias_qid) never carry the "http://www.wikidata.org/..." URI
# prefix. `location` is the WKT representation of the item's location. Every column except
# `item_qid`, `location`, `linked_entity_qid` and `from_prop_pid` is nullable. This is also the
# column order expected in the CSV pages and, prefixed with "ws_", the column order of the
# `owmf.wikidata_staging` table they get COPYed into.
ENTITY_LINK_CSV_COLUMNS = [
    "item_qid", "label", "label_en", "commons", "location", "linked_entity_qid", "from_prop_pid", "alias_qid"
]


def read_query(filename: str) -> str:
    path = join(dirname(abspath(__file__)), "..", "sql", filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


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


def _strip_uri_prefix(uri: str | None, prefix: str) -> str | None:
    if not uri:
        return None
    return uri.replace(prefix, "")


def sparql_bindings_to_entity_link_rows(bindings: list) -> list:
    """
    Convert the bindings of a SPARQL direct-related-entities query result (see
    `load-related-direct-map.sparql`) into rows in the common entity-link CSV format (see
    `ENTITY_LINK_CSV_COLUMNS`).
    """
    rows = []
    for binding in bindings:
        item = _strip_uri_prefix(binding.get("item", {}).get("value"), "http://www.wikidata.org/entity/")
        linked_entity = _strip_uri_prefix(binding.get("etymology", {}).get("value"), "http://www.wikidata.org/entity/")
        location = binding.get("location", {}).get("value")
        from_prop = _strip_uri_prefix(binding.get("from_prop", {}).get("value"), "http://www.wikidata.org/prop/")
        if not item or not linked_entity or not location or not from_prop:
            continue  # Defensive: all mandatory in the SPARQL query pattern
        rows.append([
            item,
            binding.get("label_mul", {}).get("value"),
            binding.get("label_en", {}).get("value"),
            binding.get("commons", {}).get("value"),
            location,
            linked_entity,
            from_prop,
            _strip_uri_prefix(binding.get("alias", {}).get("value"), "http://www.wikidata.org/entity/"),
        ])
    return rows


def write_entity_link_csv(path: str, rows: list) -> None:
    """Write `rows` (in the common entity-link CSV format, see `ENTITY_LINK_CSV_COLUMNS`) to `path`."""
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerows(rows)


def get_latest_wikidata_geo_parquet_url() -> str:
    """
    Query the https://wikidata-geo-dumps.toolforge.org/ machine-readable index and return the URL
    of the most recent `wikidata_geo.parquet` GeoParquet dump, preferring its CloudFront mirror
    (when available) over the Toolforge URL.
    """
    response = requests.get(WIKIDATA_GEO_DUMPS_INDEX_URL, headers={"User-Agent": USER_AGENT}, timeout=60)
    response.raise_for_status()
    dumps = response.json().get("dumps", [])
    for dump in dumps:  # Dumps are listed newest first
        for file in dump.get("files", []):
            if file.get("name") == WIKIDATA_GEO_DUMPS_PARQUET_NAME:
                url = file.get("mirror_url") or file.get("url")
                print(f"Using the Wikidata geo dump from {dump.get('date')}: {url}")
                return url
    raise Exception(f"No '{WIKIDATA_GEO_DUMPS_PARQUET_NAME}' file found in {WIKIDATA_GEO_DUMPS_INDEX_URL}")
