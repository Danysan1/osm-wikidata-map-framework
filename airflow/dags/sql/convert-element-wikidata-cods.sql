INSERT INTO oem.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_from_osm, ew_from_key_id)
SELECT osm_id, UPPER(TRIM(wikidata_cod)), FALSE, 'osm_wikidata'
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'wikidata',';') AS splitted(wikidata_cod)
WHERE osm_tags ? 'wikidata' -- TODO generalize
AND TRIM(wikidata_cod) ~* '^Q\d+$'
UNION
SELECT osm_id, UPPER(TRIM(subject_wikidata_cod)), TRUE, 'osm_subject'
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'subject:wikidata',';') AS splitted(subject_wikidata_cod)
WHERE osm_tags ? 'subject:wikidata' -- TODO generalize
AND TRIM(subject_wikidata_cod) ~* '^Q\d+$'
UNION
SELECT osm_id, UPPER(TRIM(buried_wikidata_cod)), TRUE, 'osm_buried'
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'buried:wikidata',';') AS splitted(buried_wikidata_cod)
WHERE osm_tags ? 'buried:wikidata' -- TODO generalize
AND TRIM(buried_wikidata_cod) ~* '^Q\d+$'
UNION
SELECT osm_id, UPPER(TRIM(name_etymology_wikidata_cod)), TRUE, 'osm_name_etymology'
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'name:etymology:wikidata',';') AS splitted(name_etymology_wikidata_cod)
WHERE osm_tags ? 'name:etymology:wikidata' -- TODO generalize
AND TRIM(name_etymology_wikidata_cod) ~* '^Q\d+$';