INSERT INTO public.wikidata (wd_wikidata_id)
SELECT REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
UNION
SELECT REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';') FROM public.planet_osm_point
UNION
SELECT REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';') FROM public.planet_osm_line
UNION
SELECT REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';') FROM public.planet_osm_polygon
UNION
SELECT REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';') FROM public.planet_osm_point
UNION
SELECT REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';') FROM public.planet_osm_line
UNION
SELECT REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';') FROM public.planet_osm_polygon;

INSERT INTO public.wikidata_named_after (wna_wikidata_id, wna_named_after_wikidata_id)
SELECT DISTINCT
	REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', ''),
	REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings');
