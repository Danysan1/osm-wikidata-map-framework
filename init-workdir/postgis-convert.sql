INSERT INTO element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_etymology)
SELECT el_id, TRIM(wikidata_cod), FALSE
FROM element, LATERAL REGEXP_SPLIT_TO_TABLE(el_wikidata,';') AS splitted(wikidata_cod)
WHERE LEFT(TRIM(wikidata_cod),1) = 'Q'
UNION
SELECT el_id, TRIM(subject_wikidata_cod), TRUE
FROM element, LATERAL REGEXP_SPLIT_TO_TABLE(el_subject_wikidata,';') AS splitted(subject_wikidata_cod)
WHERE LEFT(TRIM(subject_wikidata_cod),1) = 'Q'
UNION
SELECT el_id, TRIM(name_etymology_wikidata_cod), TRUE
FROM element, LATERAL REGEXP_SPLIT_TO_TABLE(el_name_etymology_wikidata,';') AS splitted(name_etymology_wikidata_cod)
WHERE LEFT(TRIM(name_etymology_wikidata_cod),1) = 'Q';