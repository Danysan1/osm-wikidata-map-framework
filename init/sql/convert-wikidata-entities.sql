INSERT INTO oem.wikidata (wd_wikidata_cod)
SELECT DISTINCT ew_wikidata_cod
FROM oem.element_wikidata_cods
LEFT JOIN oem.wikidata ON wd_wikidata_cod = ew_wikidata_cod
WHERE (ew_from_name_etymology OR ew_from_subject)
AND wikidata IS NULL;
