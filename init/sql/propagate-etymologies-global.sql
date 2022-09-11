INSERT INTO oem.etymology_template (ett_name, ett_from_et_id)
SELECT LOWER(osm_tags->>'name'), MIN(et_id)
FROM oem.etymology
JOIN oem.osmdata ON et_el_id = osm_id
WHERE osm_tags ? 'highway'
AND osm_tags ? 'name'
AND NOT el_tags->>'name' ILIKE '%th street%' -- Prevent bad propagations
AND NOT el_tags->>'name' ILIKE '%th ave%'
AND NOT el_tags->>'name' ILIKE 'universit%'
GROUP BY LOWER(osm_tags->>'name')
HAVING COUNT(DISTINCT et_wd_id) = 1;

INSERT INTO oem.etymology (
    et_el_id,
    et_wd_id,
    et_from_el_id,
    et_recursion_depth,
    et_from_osm,
    et_from_wikidata,
    et_from_name_etymology,
    et_from_name_etymology_consists,
    et_from_subject,
    et_from_subject_consists,
    et_from_wikidata_named_after,
    et_from_wikidata_dedicated_to,
    et_from_wikidata_commemorates,
    et_from_wikidata_wd_id,
    et_from_wikidata_prop_cod
) SELECT
    new_el.osm_id,
    old_et.et_wd_id,
    old_et.et_from_el_id,
    -1,
    old_et.et_from_osm,
    old_et.et_from_wikidata,
    old_et.et_from_name_etymology,
    old_et.et_from_name_etymology_consists,
    old_et.et_from_subject,
    old_et.et_from_subject_consists,
    old_et.et_from_wikidata_named_after,
    old_et.et_from_wikidata_dedicated_to,
    old_et.et_from_wikidata_commemorates,
    old_et.et_from_wikidata_wd_id,
    old_et.et_from_wikidata_prop_cod
FROM oem.etymology_template
JOIN oem.etymology AS old_et ON ett_from_et_id = old_et.et_id
JOIN oem.osmdata AS new_el
    ON new_el.osm_tags ? 'highway'
    AND new_el.osm_tags ? 'name'
    AND ett_name = LOWER(new_el.osm_tags->>'name')
LEFT JOIN oem.etymology AS new_et ON new_et.et_el_id = new_el.osm_id
WHERE new_et IS NULL;
