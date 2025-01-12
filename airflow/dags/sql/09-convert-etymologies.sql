INSERT INTO owmf.etymology (
    et_el_id, et_wd_id, et_name, et_from_el_id, et_from_osm, et_from_key_ids
)
SELECT DISTINCT osm_id, NULL::INT, splitted.entity_name, osm_id, TRUE, ARRAY['osm_text']
FROM owmf.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'{{var.value.osm_text_key}}',';') AS splitted(entity_name)
UNION
SELECT DISTINCT ew_el_id, wd_id, NULL::VARCHAR, ew_el_id, TRUE, ARRAY_AGG(ew_from_key_id)
FROM owmf.element_wikidata_cods
JOIN owmf.wikidata ON ew_wikidata_cod = wd_wikidata_cod
GROUP BY ew_el_id, wd_id
ON CONFLICT (et_el_id, et_wd_id, et_name) DO NOTHING;

--TODO el.el_tags->>'{{var.value.osm_description_key}}' AS text_etymology_descr
