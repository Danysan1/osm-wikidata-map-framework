INSERT INTO owmf.etymology (
    et_el_id,
    et_wd_id,
    et_from_el_id,
    et_recursion_depth,
    et_from_key_ids,
    et_from_osm_wikidata_wd_id,
    et_from_osm_wikidata_prop_cod
) SELECT DISTINCT ON (new_el.osm_id, old_et.et_wd_id)
    new_el.osm_id,
    old_et.et_wd_id,
    old_et.et_from_el_id,
    :depth::INT AS recursion_depth,
    ARRAY['propagated'],
    old_et.et_from_osm_wikidata_wd_id,
    old_et.et_from_osm_wikidata_prop_cod
FROM owmf.etymology AS old_et
JOIN owmf.osmdata AS old_el
    ON old_et.et_el_id = old_el.osm_id
    AND old_el.osm_tags ? 'highway'
JOIN owmf.osmdata AS new_el
    ON old_el.osm_id < new_el.osm_id
    AND new_el.osm_tags ? 'highway'
    AND new_el.osm_tags ? 'name'
    AND LOWER(old_el.osm_tags->>'name') = LOWER(new_el.osm_tags->>'name')
    AND ST_Intersects(old_el.osm_geometry, new_el.osm_geometry)
WHERE old_et.et_recursion_depth = (:depth::INT - 1)
AND old_et.et_wd_id IS NOT NULL
ON CONFLICT (et_el_id, et_wd_id, et_name) DO NOTHING
