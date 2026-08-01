"""
Fetch linked entity relationships from Wikidata.

Entities are downloaded through DuckDB, querying the periodic GeoParquet dump published at
https://wikidata-geo-dumps.toolforge.org/ (see `OwmfDownloadWikidataDAG`), then normalized into a
common CSV format (one row per item/property/linked-entity triple, see `ENTITY_LINK_CSV_COLUMNS`)
so that `OwmfDbInitDAG` can load it into the local PostGIS DB with a plain `COPY`.
"""

from os.path import abspath, dirname, join

import requests

USER_AGENT = "OSM-Wikidata-Map-Framework"

WIKIDATA_GEO_DUMPS_INDEX_URL = "https://wikidata-geo-dumps.toolforge.org/dumps/index.json"
WIKIDATA_GEO_DUMPS_PARQUET_NAME = "wikidata_geo.parquet"

# Common CSV format for downloaded Wikidata entities: one row per
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
