INSERT INTO oem.wikidata (wd_wikidata_cod)
SELECT DISTINCT ew_wikidata_cod
FROM oem.element_wikidata_cods
WHERE ew_from_osm
ON CONFLICT (wd_wikidata_cod) DO NOTHING
