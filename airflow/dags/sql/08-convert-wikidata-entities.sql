INSERT INTO owmf.wikidata (wd_wikidata_cod)
SELECT DISTINCT ew_wikidata_cod
FROM owmf.element_wikidata_cods
UNION 
SELECT DISTINCT SUBSTRING(osm_tags->>'wikidata' FROM '^Q\d+')
FROM owmf.osmdata
WHERE osm_tags->>'wikidata' ~* '^Q\d+'
ON CONFLICT (wd_wikidata_cod) DO NOTHING;

UPDATE owmf.osmdata
SET osm_wd_id = wd_id
FROM owmf.wikidata
WHERE SUBSTRING(osm_tags->>'wikidata' FROM '^Q\d+') = wd_wikidata_cod;
