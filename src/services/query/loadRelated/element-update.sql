UPDATE owmf.osmdata
SET osm_wd_id = wd_id
FROM owmf.wikidata
WHERE osm_wd_id IS NULL
AND osm_tags ? 'wikidata'
AND ( osm_tags->>'wikidata' = wd_wikidata_cod OR osm_tags->>'wikidata' = wd_alias_cod );
