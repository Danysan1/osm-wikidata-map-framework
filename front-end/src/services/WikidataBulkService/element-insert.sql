INSERT INTO owmf.osmdata (osm_geometry, osm_wd_id)
SELECT ST_GeomFromText(value->'location'->>'value', 4326), wd_id
FROM json_array_elements(($1::JSON)->'results'->'bindings')
JOIN owmf.wikidata ON wd_wikidata_cod = REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
LEFT JOIN owmf.osmdata ON osm_wd_id = wd_id
WHERE osm_id IS NULL -- Only insert items that are not already in the table
AND value->'location'->>'value' ^@ 'Point('
ON CONFLICT (osm_osm_type, osm_osm_id, osm_wd_id) DO NOTHING;
