INSERT INTO owmf.etymology (
    et_el_id,
    et_wd_id,
    et_from_key_ids,
    et_from_el_id,
    et_from_osm_wikidata_wd_id,
    et_from_osm_wikidata_prop_cod
)
SELECT
    osm_id,
    to_wd.wd_id,
    CASE WHEN osm_osm_id IS NULL THEN ARRAY['wd_direct'] ELSE ARRAY['wd_direct','osm_wikidata_direct'] END,
    osm_id,
    from_wd.wd_id,
    REPLACE(value->'from_prop'->>'value', 'http://www.wikidata.org/prop/', '')
FROM json_array_elements(($1::JSON)->'results'->'bindings')
JOIN owmf.wikidata AS to_wd ON to_wd.wd_wikidata_cod = REPLACE(value->'etymology'->>'value', 'http://www.wikidata.org/entity/', '')
JOIN owmf.wikidata AS from_wd ON from_wd.wd_wikidata_cod = REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
JOIN owmf.osmdata AS from_osm ON osm_wd_id = from_wd.wd_id
WHERE value->'etymology'->>'value' ^@ 'http://www.wikidata.org/entity/'
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING