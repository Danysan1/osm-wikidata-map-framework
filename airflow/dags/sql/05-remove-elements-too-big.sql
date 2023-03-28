DELETE FROM oem.osmdata
WHERE (
    osm_tags ? %(osm_key)s
    AND osm_tags ? 'wikidata'
    AND osm_tags->>%(osm_key)s = osm_tags->>'wikidata'
)
OR ST_Area(osm_geometry) >= 0.005; -- EPSG 4326 => 0.005 square degrees
