WITH road_etymology AS (
        SELECT LOWER(osm_tags->>'name') AS low_name, et_wd_id, MIN(et_id) as et_id
        FROM oem.etymology
        JOIN oem.osmdata ON et_el_id = osm_id
        WHERE osm_tags ? 'highway'
        AND osm_tags ? 'name'
        AND NOT osm_tags->>'name' ILIKE '%th street%' -- Prevent bad propagations
        AND NOT osm_tags->>'name' ILIKE '%th ave%'
        GROUP BY low_name, et_wd_id, ST_ReducePrecision(ST_Centroid(osm_geometry), 0.1)
    ),
    propagatable_etymology AS (
        SELECT low_name, MIN(et_id) AS et_id
        FROM road_etymology
        GROUP BY low_name
        HAVING COUNT(*) > 1
        AND COUNT(DISTINCT et_wd_id) = 1
    )
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
    -1 AS recursion_depth,
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
FROM propagatable_etymology AS pet
JOIN oem.etymology AS old_et ON pet.et_id = old_et.et_id
JOIN oem.osmdata AS new_el
    ON new_el.osm_tags ? 'highway'
    AND new_el.osm_tags ? 'name'
    AND pet.low_name = LOWER(new_el.osm_tags->>'name')
LEFT JOIN oem.etymology AS new_et ON new_et.et_el_id = new_el.osm_id
WHERE new_et IS NULL;
