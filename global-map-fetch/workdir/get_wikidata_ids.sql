SELECT STRING_AGG('wd:'||wid, ' ') FROM (
	SELECT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_point
	UNION
	SELECT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_line
	UNION
	SELECT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_polygon
) AS wikidata(wid)