CREATE MATERIALIZED VIEW oem.vm_dataset AS
SELECT
    wd.wd_wikidata_cod AS "wikidata_id",
    ele.el_tags->>'name' AS "name",
	COUNT(*) AS "occurences",
    BOOL_OR(ety.et_from_osm) AS "from_osm",
    BOOL_OR(ety.et_from_wikidata_wd_id IS NOT NULL) AS "from_wikidata",
    BOOL_OR(ety.et_from_parts_of_wd_id IS NOT NULL) AS "from_wikidata_parts",
    BOOL_OR(ety.et_recursion_depth != 0) AS "from_propagation"
FROM oem.etymology AS ety
JOIN oem.wikidata AS wd ON wd.wd_id = ety.et_wd_id
JOIN oem.element AS ele ON ele.el_id = ety.et_el_id
GROUP BY wd.wd_id, ele.el_tags->>'name'
ORDER BY LENGTH(wd.wd_wikidata_cod), wd.wd_wikidata_cod;
