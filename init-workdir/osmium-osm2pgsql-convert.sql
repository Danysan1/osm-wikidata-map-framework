INSERT INTO etymology (et_el_id, et_wd_id)
SELECT DISTINCT ew_el_id, wd_id
FROM element_wikidata_ids
JOIN wikidata ON ew_wikidata_id = wd_wikidata_id
WHERE ew_etymology
UNION
SELECT DISTINCT ew_el_id, wd_id
FROM element_wikidata_ids
JOIN wikidata_named_after ON ew_wikidata_id = wna_wikidata_id
JOIN wikidata ON wna_named_after_wikidata_id = wd_wikidata_id
WHERE NOT ew_etymology;
