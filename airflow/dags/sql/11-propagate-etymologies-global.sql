WITH relevant_element AS (
        SELECT
            osm_id,
            LOWER(osm_tags->>'name') AS lower_name,
            ST_ReducePrecision(ST_Centroid(osm_geometry), 0.1) AS centroid
        FROM owmf.osmdata
        WHERE osm_tags ? 'highway' -- Include only highways
        AND osm_tags ? 'name' -- Include only elements with a name
        AND NOT osm_has_text_etymology
        AND NOT osm_tags->>'name' ILIKE '%th %' -- Exclude known problematic names (e.g. 4th street, 5th avenue, ...)
        AND NOT osm_tags->>'name' ILIKE '%st %' -- Exclude known problematic names (e.g. 1st street, 101st avenue, ...)
        AND NOT osm_tags->>'name' ILIKE '%nd %' -- Exclude known problematic names (e.g. 2nd street, 102nd avenue, ...)
        AND NOT osm_tags->>'name' ILIKE '%rd %' -- Exclude known problematic names (e.g. 3rd street, 103rd avenue, ...)
    ),
    road_etymology AS (
        SELECT lower_name, et_wd_id, MIN(et_id) as et_id
        FROM owmf.etymology
        JOIN relevant_element ON et_el_id = osm_id
        WHERE et_recursion_depth = 0 -- Exclude linked entities already locally propagated
        GROUP BY lower_name, et_wd_id, centroid
    ),
    propagatable_etymology AS (
        SELECT lower_name, MIN(et_id) AS et_id
        FROM road_etymology
        GROUP BY lower_name
        HAVING COUNT(*) > 1
        AND COUNT(DISTINCT et_wd_id) = 1
    )
INSERT INTO owmf.etymology (
    et_el_id,
    et_wd_id,
    et_from_el_id,
    et_recursion_depth,
    et_from_osm,
    et_from_key_ids,
    et_from_osm_wikidata_wd_id,
    et_from_osm_wikidata_prop_cod
)
SELECT
    new_el.osm_id,
    old_et.et_wd_id,
    old_et.et_from_el_id,
    -1 AS recursion_depth,
    FALSE,
    ARRAY['propagated'],
    old_et.et_from_osm_wikidata_wd_id,
    old_et.et_from_osm_wikidata_prop_cod
FROM propagatable_etymology AS pet
JOIN owmf.etymology AS old_et ON pet.et_id = old_et.et_id
JOIN relevant_element AS new_el ON pet.lower_name = new_el.lower_name
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING
