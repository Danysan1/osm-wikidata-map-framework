UPDATE public.wikidata
SET wd_position=ST_GeomFromText(response->'wkt_coords'->>'value', 4326)
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings') AS response
WHERE REPLACE(response->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '') = wikidata.wd_wikidata_id
