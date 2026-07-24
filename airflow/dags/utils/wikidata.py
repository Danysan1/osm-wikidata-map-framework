"""
Load linked entity relationships from Wikidata

* load into the `osmdata` table of the local PostGIS DB all the Wikidata entities with a location and the configured direct properties which do not already exist
* load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
* load into the `etymology` table of the local PostGIS DB the direct related relationships

Uses the Wikidata SPARQL query service.
"""

import json
from os.path import abspath, dirname, join

import requests

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
