INSERT INTO owmf.osmdata (
    osm_geometry,
    osm_wd_id,
    osm_tags
)
SELECT
    ST_GeomFromText(value->'location'->>'value', 4326),
    wd_id,
    JSON_BUILD_OBJECT (
        'name:de', value->'label_de'->>'value',
        'name', value->'label_en'->>'value',
        'name:it', value->'label_it'->>'value',
        'wikimedia_commons', 'Category:' || (value->'commons'->>'value')
    )
FROM json_array_elements(($1::JSON)->'results'->'bindings')
JOIN owmf.wikidata ON wd_wikidata_cod = REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
LEFT JOIN owmf.osmdata ON osm_wd_id = wd_id
WHERE osm_id IS NULL -- Only insert items that are not already in the table
AND value->'location'->>'value' ^@ 'Point('
