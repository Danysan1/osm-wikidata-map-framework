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
    CASE WHEN osm_osm_id IS NULL THEN ARRAY['wd_direct'] ELSE ARRAY['wd_direct','osm_wd_direct'] END,
    osm_id,
    from_wd.wd_id,
    ws_from_prop_pid
FROM owmf.wikidata_staging
JOIN owmf.wikidata AS to_wd ON to_wd.wd_wikidata_cod = ws_linked_entity_qid
JOIN owmf.wikidata AS from_wd ON from_wd.wd_wikidata_cod = ws_item_qid
JOIN owmf.osmdata AS from_osm ON osm_wd_id = from_wd.wd_id
ON CONFLICT (et_el_id, et_wd_id, et_name) DO NOTHING
