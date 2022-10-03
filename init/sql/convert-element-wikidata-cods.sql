INSERT INTO oem.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_from_name_etymology, ew_from_subject, ew_from_wikidata)
SELECT osm_id, UPPER(TRIM(wikidata_cod)), FALSE, FALSE, TRUE
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'wikidata',';') AS splitted(wikidata_cod)
WHERE osm_tags ? 'wikidata'
AND TRIM(wikidata_cod) ~* '^Q\d+$'
UNION
SELECT osm_id, UPPER(TRIM(subject_wikidata_cod)), FALSE, TRUE, FALSE
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'subject:wikidata',';') AS splitted(subject_wikidata_cod)
WHERE osm_tags ? 'subject:wikidata'
AND TRIM(subject_wikidata_cod) ~* '^Q\d+$'
UNION
SELECT osm_id, UPPER(TRIM(name_etymology_wikidata_cod)), TRUE, FALSE, FALSE
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'name:etymology:wikidata',';') AS splitted(name_etymology_wikidata_cod)
WHERE osm_tags ? 'name:etymology:wikidata'
AND TRIM(name_etymology_wikidata_cod) ~* '^Q\d+$';