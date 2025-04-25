CREATE OR REPLACE VIEW owmf.boundaries_dump AS
SELECT
    el.el_geometry AS geom,
    el.el_id as id,
    el.el_osm_type AS osm_type,
    el.el_osm_id AS osm_id,
    CASE WHEN el.el_osm_id IS NULL THEN NULL ELSE 'openstreetmap.org' END AS from_osm_instance,
    el.el_osm_id IS NULL AS from_wikidata,
    STRING_AGG(DISTINCT ARRAY_TO_STRING(et_from_key_ids,','),',') AS from_key_ids,
    1 AS boundary,
    el.el_tags AS tags,
    el.el_tags->>'admin_level' AS admin_level, -- Required as top level item for Maplibre layer filtering
    CASE
        WHEN el.el_tags ? 'height' AND el.el_tags->>'height' ~ '^\d+$' THEN (el.el_tags->>'height')::INTEGER
        WHEN el.el_tags ? 'building:levels' AND el.el_tags->>'building:levels' ~ '^\d+$' THEN (el.el_tags->>'building:levels')::INTEGER * 4
        WHEN el.el_tags ? 'building' THEN 6
        ELSE NULL
    END AS render_height,
    el.el_commons AS commons,
    el.el_wikidata_cod AS wikidata,
    el.el_wikipedia AS wikipedia,
    CASE WHEN COUNT(et_id) = 0 THEN NULL ELSE JSON_AGG(JSON_BUILD_OBJECT(
        'from_osm_instance', CASE WHEN et_from_osm THEN 'openstreetmap.org' ELSE NULL END,
        'from_osm_type', from_el.el_osm_type,
        'from_osm_id', from_el.el_osm_id,
        'osm_wd_join_field', CASE WHEN et_from_osm_wikidata_wd_id IS NULL THEN NULL ELSE 'OSM' END,
        'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
        'from_wikidata_entity', from_wd.wd_wikidata_cod,
        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
        'propagated', et_recursion_depth != 0,
        'name', et_name,
        'wikidata', wd.wd_wikidata_cod
    )) END AS linked_entities,
    COUNT(DISTINCT et.et_wd_id) AS linked_entity_count
FROM owmf.element AS el
LEFT JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
LEFT JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et.et_from_osm_wikidata_wd_id
LEFT JOIN owmf.element AS from_el ON from_el.el_id = et.et_from_el_id
WHERE el.el_is_boundary
GROUP BY el.el_id;

CREATE OR REPLACE VIEW owmf.details_dump AS
SELECT
    el.el_geometry AS geom,
    el.el_id as id,
    el.el_osm_type AS osm_type,
    el.el_osm_id AS osm_id,
    CASE WHEN el.el_osm_id IS NULL THEN NULL ELSE 'openstreetmap.org' END AS from_osm_instance,
    el.el_osm_id IS NULL AS from_wikidata,
    STRING_AGG(DISTINCT ARRAY_TO_STRING(et_from_key_ids,','),',') AS from_key_ids,
    el.el_tags AS tags,
    CASE
        WHEN el.el_tags ? 'height' AND el.el_tags->>'height' ~ '^\d+$' THEN (el.el_tags->>'height')::INTEGER
        WHEN el.el_tags ? 'building:levels' AND el.el_tags->>'building:levels' ~ '^\d+$' THEN (el.el_tags->>'building:levels')::INTEGER * 4
        WHEN el.el_tags ? 'building' THEN 6
        ELSE NULL
    END AS render_height,
    el.el_commons AS commons,
    el.el_wikidata_cod AS wikidata,
    el.el_wikipedia AS wikipedia,
    CASE WHEN COUNT(et_id) = 0 THEN NULL ELSE JSON_AGG(JSON_BUILD_OBJECT(
        'from_osm_instance', CASE WHEN et_from_osm THEN 'openstreetmap.org' ELSE NULL END,
        'from_osm_type', from_el.el_osm_type,
        'from_osm_id', from_el.el_osm_id,
        'osm_wd_join_field', CASE WHEN et_from_osm_wikidata_wd_id IS NULL THEN NULL ELSE 'OSM' END,
        'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
        'from_wikidata_entity', from_wd.wd_wikidata_cod,
        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
        'propagated', et_recursion_depth != 0,
        'name', et_name,
        'wikidata', wd.wd_wikidata_cod
    )) END AS linked_entities,
    COUNT(DISTINCT et.et_wd_id) AS linked_entity_count
FROM owmf.element AS el
LEFT JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
LEFT JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et.et_from_osm_wikidata_wd_id
LEFT JOIN owmf.element AS from_el ON from_el.el_id = et.et_from_el_id
WHERE NOT el.el_is_boundary
GROUP BY el.el_id;

-- CREATE MATERIALIZED VIEW IF NOT EXISTS owmf.vm_elements AS
-- SELECT
--     ST_ReducePrecision(ST_Centroid(el_geometry), 0.03::double precision) AS geom,
--     COUNT(DISTINCT LOWER(el_tags ->> 'name'::text)) AS el_num
-- FROM owmf.element
-- GROUP BY (ST_ReducePrecision(ST_Centroid(el_geometry), 0.03::double precision))
-- HAVING COUNT(DISTINCT LOWER(el_tags ->> 'name'::text)) > 2;
