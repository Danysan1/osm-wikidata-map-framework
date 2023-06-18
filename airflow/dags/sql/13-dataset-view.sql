CREATE MATERIALIZED VIEW IF NOT EXISTS owmf.vm_dataset AS
SELECT
    wd.wd_wikidata_cod AS wikidata_id,
    ele.el_tags->>'name' AS element_name,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_wikidata_wd_id IS NULL AND ety.et_from_osm) AS count_osm,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_wikidata_wd_id IS NOT NULL) AS count_osm_wikidata,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_wikidata_wd_id IS NULL AND NOT ety.et_from_osm) AS count_wikidata,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NOT NULL) AS count_part_of,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth != 0) AS count_propagation
FROM owmf.etymology AS ety
JOIN owmf.wikidata AS wd ON wd.wd_id = ety.et_wd_id
JOIN owmf.element AS ele ON ele.el_id = ety.et_el_id
GROUP BY wd.wd_id, ele.el_tags->>'name'
ORDER BY LENGTH(wd.wd_wikidata_cod), wd.wd_wikidata_cod, ele.el_tags->>'name'