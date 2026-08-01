DELETE FROM owmf.osmdata
WHERE osm_tags ? %(osm_key)s
AND osm_tags ? 'wikidata'
AND osm_tags->>%(osm_key)s = osm_tags->>'wikidata';
