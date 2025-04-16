CREATE MATERIALIZED VIEW IF NOT EXISTS owmf.vm_dataset AS
SELECT
    wd.wd_wikidata_cod AS wikidata_id,
    COALESCE(ele.el_tags->>'name', ele.el_tags->>'name:en', ele.el_tags->>'wikimedia_commons') AS element_name,
    COUNT(*) AS count_total,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_osm_wikidata_wd_id IS NULL) AS count_osm,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_osm_wikidata_wd_id IS NOT NULL AND ele.el_osm_id IS NOT NULL) AS count_osm_wikidata,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_osm_wikidata_wd_id IS NOT NULL AND ele.el_osm_id IS NULL) AS count_wikidata,
    COUNT(*) FILTER (WHERE ety.et_recursion_depth != 0) AS count_propagation
FROM owmf.etymology AS ety
JOIN owmf.wikidata AS wd ON wd.wd_id = ety.et_wd_id
JOIN owmf.element AS ele ON ele.el_id = ety.et_el_id
WHERE ele.el_tags->>'name' IS NOT NULL OR ele.el_tags->>'name:en' IS NOT NULL
GROUP BY wikidata_id, element_name
ORDER BY LENGTH(wd.wd_wikidata_cod), wd.wd_wikidata_cod, element_name