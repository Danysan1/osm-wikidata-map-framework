WITH road_etymology AS (
        SELECT LOWER(osm_tags->>'name') AS low_name, et_wd_id, MIN(et_id) as et_id
        FROM oem.etymology
        JOIN oem.osmdata ON et_el_id = osm_id
        WHERE osm_tags ? 'highway' -- Include only highways
        AND osm_tags ? 'name' -- Include only elements with a name
        AND et_recursion_depth = 0 -- Exclude etymologies already locally propagated
        AND et_from_parts_of_wd_id IS NULL -- Exclude etymologies derived as parts
        AND NOT osm_tags->>'name' ILIKE '%th street%' -- Exclude known problematic names
        AND NOT osm_tags->>'name' ILIKE '%th ave%' -- Exclude known problematic names
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
    et_from_wikidata_wd_id,
    et_from_wikidata_prop_cod
) SELECT
    new_el.osm_id,
    old_et.et_wd_id,
    old_et.et_from_el_id,
    -1 AS recursion_depth,
    old_et.et_from_osm,
    old_et.et_from_wikidata_wd_id,
    old_et.et_from_wikidata_prop_cod
FROM propagatable_etymology AS pet
JOIN oem.etymology AS old_et ON pet.et_id = old_et.et_id
JOIN oem.osmdata AS new_el
    ON new_el.osm_tags ? 'highway'
    AND new_el.osm_tags ? 'name'
    AND pet.low_name = LOWER(new_el.osm_tags->>'name')
ON CONFLICT (et_el_id, et_wd_id) DO NOTHING
