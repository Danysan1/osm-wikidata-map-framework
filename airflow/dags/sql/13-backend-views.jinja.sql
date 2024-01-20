CREATE OR REPLACE VIEW owmf.etymology_map_boundaries_dump AS
SELECT
    el.el_geometry AS geom,
    el.el_id as id,
    el.el_osm_type AS osm_type,
    el.el_osm_id AS osm_id,
    CASE WHEN el.el_osm_id IS NULL THEN NULL ELSE 1 END AS from_osm, -- Using int instead of bool due to https://github.com/felt/tippecanoe/issues/180
    CASE WHEN el.el_osm_id IS NULL THEN 1 ELSE NULL END AS from_wikidata,
    STRING_AGG(ARRAY_TO_STRING(et_from_key_ids,','),',') AS from_key_ids,
    1 AS boundary,
    el.el_tags->>'admin_level' AS admin_level,
    el.el_tags->>'name' AS name,
    el.el_tags->>'name:ar' AS "name:ar",
    el.el_tags->>'name:da' AS "name:da",
    el.el_tags->>'name:de' AS "name:de",
    el.el_tags->>'name:en' AS "name:en",
    el.el_tags->>'name:es' AS "name:es",
    el.el_tags->>'name:fr' AS "name:fr",
    el.el_tags->>'name:hi' AS "name:hi",
    el.el_tags->>'name:it' AS "name:it",
    el.el_tags->>'name:ru' AS "name:ru",
    el.el_tags->>'name:zh' AS "name:zh",
    el.el_tags->>'alt_name' AS alt_name,
    el.el_tags->>'official_name' AS official_name,
    el.el_tags->>'{{var.value.osm_text_key}}' AS text_etymology,
    el.el_tags->>'{{var.value.osm_description_key}}' AS text_etymology_descr,
    CASE
        WHEN el.el_tags ? 'height' AND el.el_tags->>'height' ~ '^\d+$' THEN (el.el_tags->>'height')::INTEGER
        WHEN el.el_tags ? 'building:levels' AND el.el_tags->>'building:levels' ~ '^\d+$' THEN (el.el_tags->>'building:levels')::INTEGER * 4
        WHEN el.el_tags ? 'building' THEN 6
        ELSE NULL
    END AS render_height,
    el.el_commons AS commons,
    el.el_wikidata_cod AS wikidata,
    el.el_wikipedia AS wikipedia,
    JSON_AGG(JSON_BUILD_OBJECT(
        'from_osm', et_from_osm,
        'from_osm_type', from_el.el_osm_type,
        'from_osm_id', from_el.el_osm_id,
        'osm_wd_join_field', CASE WHEN et_from_osm_wikidata_wd_id IS NULL THEN NULL ELSE 'OSM' END,
        'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
        'from_wikidata_entity', from_wd.wd_wikidata_cod,
        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
        'propagated', et_recursion_depth != 0,
        'wikidata', wd.wd_wikidata_cod
    )) AS etymologies
FROM owmf.element AS el
LEFT JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
LEFT JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et.et_from_osm_wikidata_wd_id
LEFT JOIN owmf.element AS from_el ON from_el.el_id = et.et_from_el_id
WHERE el.el_tags IS NOT NULL
AND (el.el_tags ? 'boundary' OR (el.el_tags ? 'type' AND el.el_tags->>'type' = 'boundary'))
GROUP BY el.el_id;

CREATE OR REPLACE VIEW owmf.etymology_map_details_dump AS
SELECT
    el.el_geometry AS geom,
    el.el_id as id,
    el.el_osm_type AS osm_type,
    el.el_osm_id AS osm_id,
    CASE WHEN el.el_osm_id IS NULL THEN NULL ELSE 1 END AS from_osm, -- Using int instead of bool due to https://github.com/felt/tippecanoe/issues/180
    CASE WHEN el.el_osm_id IS NULL THEN 1 ELSE NULL END AS from_wikidata,
    STRING_AGG(ARRAY_TO_STRING(et_from_key_ids,','),',') AS from_key_ids,
    el.el_tags->>'name' AS name,
    el.el_tags->>'name:ar' AS "name:ar",
    el.el_tags->>'name:da' AS "name:da",
    el.el_tags->>'name:de' AS "name:de",
    el.el_tags->>'name:en' AS "name:en",
    el.el_tags->>'name:es' AS "name:es",
    el.el_tags->>'name:fr' AS "name:fr",
    el.el_tags->>'name:hi' AS "name:hi",
    el.el_tags->>'name:it' AS "name:it",
    el.el_tags->>'name:ru' AS "name:ru",
    el.el_tags->>'name:zh' AS "name:zh",
    el.el_tags->>'alt_name' AS alt_name,
    el.el_tags->>'official_name' AS official_name,
    el.el_tags->>'{{var.value.osm_text_key}}' AS text_etymology,
    el.el_tags->>'{{var.value.osm_description_key}}' AS text_etymology_descr,
    CASE
        WHEN el.el_tags ? 'height' AND el.el_tags->>'height' ~ '^\d+$' THEN (el.el_tags->>'height')::INTEGER
        WHEN el.el_tags ? 'building:levels' AND el.el_tags->>'building:levels' ~ '^\d+$' THEN (el.el_tags->>'building:levels')::INTEGER * 4
        WHEN el.el_tags ? 'building' THEN 6
        ELSE NULL
    END AS render_height,
    el.el_commons AS commons,
    el.el_wikidata_cod AS wikidata,
    el.el_wikipedia AS wikipedia,
    JSON_AGG(JSON_BUILD_OBJECT(
        'from_osm', et_from_osm,
        'from_osm_type', from_el.el_osm_type,
        'from_osm_id', from_el.el_osm_id,
        'osm_wd_join_field', CASE WHEN et_from_osm_wikidata_wd_id IS NULL THEN NULL ELSE 'OSM' END,
        'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
        'from_wikidata_entity', from_wd.wd_wikidata_cod,
        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
        'propagated', et_recursion_depth != 0,
        'wikidata', wd.wd_wikidata_cod
    )) AS etymologies
FROM owmf.element AS el
LEFT JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
LEFT JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et.et_from_osm_wikidata_wd_id
LEFT JOIN owmf.element AS from_el ON from_el.el_id = et.et_from_el_id
WHERE el.el_tags IS NULL
OR NOT (el.el_tags ? 'boundary' OR (el.el_tags ? 'type' AND el.el_tags->>'type' = 'boundary'))
GROUP BY el.el_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS owmf.vm_elements AS
SELECT
    ST_ReducePrecision(ST_Centroid(el_geometry), 0.03::double precision) AS geom,
    COUNT(DISTINCT LOWER(el_tags ->> 'name'::text)) AS el_num
FROM owmf.element
GROUP BY (ST_ReducePrecision(ST_Centroid(el_geometry), 0.03::double precision))
HAVING COUNT(DISTINCT LOWER(el_tags ->> 'name'::text)) > 2;