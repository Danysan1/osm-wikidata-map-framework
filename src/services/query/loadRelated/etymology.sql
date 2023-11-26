INSERT INTO owmf.etymology(
    et_el_id, et_wd_id, et_from_key_ids, et_from_osm_wikidata_wd_id, et_from_osm_wikidata_prop_cod
)
SELECT
    osm_id,
    wd_id,
    ARRAY['wd_direct'],
    wd_id,
    REPLACE(value->'from_prop'->>'value', 'http://www.wikidata.org/prop/direct/', '')
FROM json_array_elements(($1::JSON)->'results'->'bindings')
JOIN owmf.osmdata
    ON osm_wikidata_cod = REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
JOIN owmf.wikidata ON wd_wikidata_cod = REPLACE(value->'etymology'->>'value', 'http://www.wikidata.org/entity/', '')
WHERE value->'etymology'->>'value' LIKE 'http://www.wikidata.org/entity/%'
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING