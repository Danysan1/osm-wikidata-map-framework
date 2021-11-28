INSERT INTO wikidata (wd_wikidata_id)
SELECT val
FROM (
	SELECT TRIM(REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')) as val
	FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
	UNION
	SELECT TRIM(REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';')) as val FROM planet_osm_point
	UNION
	SELECT TRIM(REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';')) as val FROM planet_osm_line
	UNION
	SELECT TRIM(REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';')) as val FROM planet_osm_polygon
	UNION
	SELECT TRIM(REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';')) as val FROM planet_osm_point
	UNION
	SELECT TRIM(REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';')) as val FROM planet_osm_line
	UNION
	SELECT TRIM(REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';')) as val FROM planet_osm_polygon
) AS x
WHERE LEFT(val,1)='Q';

INSERT INTO wikidata_named_after (wna_wikidata_id, wna_named_after_wikidata_id)
SELECT DISTINCT
	REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', ''),
	REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
WHERE LEFT(value->'namedAfter'->>'value', 31) = 'http://www.wikidata.org/entity/';
