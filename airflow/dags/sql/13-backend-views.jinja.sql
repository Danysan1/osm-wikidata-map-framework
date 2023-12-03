CREATE OR REPLACE VIEW owmf.etymology_map_dump AS
SELECT
    el.el_geometry AS geom,
    el.el_id as id,
    el.el_osm_type AS osm_type,
    el.el_osm_id AS osm_id,
    el.el_osm_id IS NOT NULL AS from_osm,
    el.el_osm_id IS NULL AS from_wikidata,
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
    el.el_commons AS commons,
    el.el_wikidata_cod AS wikidata,
    el.el_wikipedia AS wikipedia,
    JSON_AGG(JSON_BUILD_OBJECT(
        'et_id', et_id,
        'from_osm', et_from_osm,
        'from_osm_type', from_el.el_osm_type,
        'from_osm_id', from_el.el_osm_id,
        'osm_wd_join_field', CASE WHEN et_from_osm_wikidata_wd_id IS NULL THEN NULL ELSE 'OSM' END,
        'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
        'from_wikidata_entity', from_wd.wd_wikidata_cod,
        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
        'propagated', et_recursion_depth != 0,
        'wd_id', wd.wd_id,
        'wikidata', wd.wd_wikidata_cod
    )) AS etymologies,
    COUNT(wd.wd_id) AS num_etymologies
FROM owmf.element AS el
LEFT JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
LEFT JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et.et_from_osm_wikidata_wd_id
LEFT JOIN owmf.element AS from_el ON from_el.el_id = et.et_from_el_id
GROUP BY el.el_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS owmf.vm_elements AS
SELECT
    ST_ReducePrecision(ST_Centroid(el_geometry), 0.04::double precision) AS geom,
    COUNT(DISTINCT LOWER(el_tags ->> 'name'::text)) AS el_num
FROM owmf.element
GROUP BY (ST_ReducePrecision(ST_Centroid(el_geometry), 0.04::double precision))
HAVING COUNT(DISTINCT LOWER(el_tags ->> 'name'::text)) > 2;