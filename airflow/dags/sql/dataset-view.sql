CREATE VIEW oem.v_dataset AS
SELECT
    wd.wd_wikidata_cod AS "wikidata_id",
    ele.el_tags->>'name' AS "name",
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_etymology) AS "from_osm_etymology",
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_subject) AS "from_osm_subject",
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_buried) AS "from_osm_buried",
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_wikidata_wd_id IS NOT NULL) AS "from_wikidata",
    COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NOT NULL) AS "from_part_of",
    COUNT(*) FILTER (WHERE ety.et_recursion_depth != 0 AND ety.et_from_parts_of_wd_id IS NULL) AS "from_propagation"
FROM oem.etymology AS ety
JOIN oem.wikidata AS wd ON wd.wd_id = ety.et_wd_id
JOIN oem.element AS ele ON ele.el_id = ety.et_el_id
GROUP BY wd.wd_id, ele.el_tags->>'name'
ORDER BY LENGTH(wd.wd_wikidata_cod), wd.wd_wikidata_cod;
