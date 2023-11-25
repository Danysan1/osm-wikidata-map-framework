INSERT INTO owmf.osmdata (osm_geometry, osm_wikidata_cod)
SELECT DISTINCT
    ST_GeomFromText(value->'location'->>'value', 4326),
    REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(($1::JSON)->'results'->'bindings')
LEFT JOIN owmf.osmdata
    ON osm_wikidata_cod = REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
WHERE osm_id IS NULL -- Only insert items that are not already in the table
AND value->'location'->>'value' LIKE 'Point(%';