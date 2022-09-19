INSERT INTO oem.etymology (
    et_el_id,
    et_wd_id,
    et_source_color,
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
) SELECT DISTINCT ON (new_el.osm_id, old_et.et_wd_id)
    new_el.osm_id,
    old_et.et_wd_id,
    '#ff6633' AS source_color,
    old_et.et_from_el_id,
    :depth::INT AS recursion_depth,
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
FROM oem.etymology AS old_et
JOIN oem.osmdata AS old_el
    ON old_et.et_el_id = old_el.osm_id
    AND old_el.osm_tags ?? 'highway' -- As of PHP 7.4.0, question marks can be escaped by doubling them. That means that the ?? string will be translated to ? when sending the query to the database.
JOIN oem.osmdata AS new_el
    ON old_el.osm_id < new_el.osm_id
    AND new_el.osm_tags ?? 'highway'
    AND new_el.osm_tags ?? 'name'
    AND LOWER(old_el.osm_tags->>'name') = LOWER(new_el.osm_tags->>'name')
    AND ST_Intersects(old_el.osm_geometry, new_el.osm_geometry)
LEFT JOIN oem.etymology AS new_et ON new_et.et_el_id = new_el.osm_id
WHERE old_et.et_recursion_depth = (:depth::INT - 1)
AND new_et IS NULL;
