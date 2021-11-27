SELECT STRING_AGG('wd:'||wid, ' ') FROM (
	SELECT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_point WHERE tags?'wikidata'
	UNION
	SELECT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_line WHERE tags?'wikidata'
	UNION
	SELECT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_polygon WHERE tags?'wikidata'
) AS wikidata(wid)
