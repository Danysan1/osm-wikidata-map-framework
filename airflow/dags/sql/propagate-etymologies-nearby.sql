INSERT INTO oem.etymology (
    et_el_id,
    et_wd_id,
    et_from_el_id,
    et_recursion_depth,
    et_from_osm,
    et_from_key_ids,
    et_from_osm_wikidata_wd_id,
    et_from_osm_wikidata_prop_cod
) SELECT DISTINCT ON (new_el.osm_id, old_et.et_wd_id)
    new_el.osm_id,
    old_et.et_wd_id,
    old_et.et_from_el_id,
    :depth::INT AS recursion_depth,
    FALSE,
    ARRAY['osm_propagated'],
    old_et.et_from_osm_wikidata_wd_id,
    old_et.et_from_osm_wikidata_prop_cod
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
WHERE old_et.et_recursion_depth = (:depth::INT - 1)
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING
