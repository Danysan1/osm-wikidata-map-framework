DELETE FROM owmf.osmdata
WHERE (
    osm_tags ? %(osm_key)s
    AND osm_tags ? 'wikidata'
    AND osm_tags->>%(osm_key)s = osm_tags->>'wikidata'
)
OR ST_Area(osm_geometry) >= 0.004; -- EPSG 4326 => 0.004 square degrees

SELECT pg_catalog.setval(pg_get_serial_sequence('owmf.osmdata', 'osm_id'), MAX(osm_id)) FROM owmf.osmdata;
