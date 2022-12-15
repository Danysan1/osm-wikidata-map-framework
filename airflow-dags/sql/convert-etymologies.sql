INSERT INTO oem.etymology (et_el_id, et_wd_id, et_from_el_id, et_from_osm)
SELECT DISTINCT ew_el_id, wd_id, ew_el_id, TRUE
FROM oem.element_wikidata_cods
JOIN oem.wikidata ON ew_wikidata_cod = wd_wikidata_cod
WHERE ew_from_name_etymology OR ew_from_subject OR ew_from_buried
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING
