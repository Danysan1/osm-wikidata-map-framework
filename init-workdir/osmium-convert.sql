INSERT INTO etymology (et_el_id, et_wd_id)
SELECT DISTINCT ew_el_id, wd_id
FROM element_wikidata_cods
JOIN wikidata ON ew_wikidata_cod = wd_wikidata_cod
WHERE ew_etymology
UNION
SELECT DISTINCT ew_el_id, wd_id
FROM element_wikidata_cods
JOIN wikidata_named_after ON ew_wikidata_cod = wna_wikidata_cod
JOIN wikidata ON wna_named_after_wikidata_cod = wd_wikidata_cod
WHERE NOT ew_etymology;

DELETE FROM element
WHERE el_id NOT IN (SELECT et_el_id FROM etymology);
