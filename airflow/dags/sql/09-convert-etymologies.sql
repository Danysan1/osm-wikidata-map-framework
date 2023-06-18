INSERT INTO owmf.etymology (
    et_el_id, et_wd_id, et_from_el_id, et_from_osm, et_from_key_ids
)
SELECT DISTINCT ew_el_id, wd_id, ew_el_id, TRUE, ARRAY_AGG(ew_from_key_id)
FROM owmf.element_wikidata_cods
JOIN owmf.wikidata ON ew_wikidata_cod = wd_wikidata_cod
WHERE ew_from_osm
GROUP BY ew_el_id, wd_id
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING
