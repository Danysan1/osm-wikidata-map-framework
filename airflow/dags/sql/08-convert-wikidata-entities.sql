INSERT INTO owmf.wikidata (wd_wikidata_cod)
SELECT DISTINCT ew_wikidata_cod
FROM owmf.element_wikidata_cods
WHERE ew_from_osm
ON CONFLICT (wd_wikidata_cod) DO NOTHING
