INSERT INTO wikidata (wd_wikidata_cod)
SELECT val
FROM (
	SELECT REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '') as val
	FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
	UNION
	SELECT ew_wikidata_cod FROM element_wikidata_cods
) AS x
WHERE LEFT(val,1)='Q';

INSERT INTO wikidata_named_after (wna_wikidata_cod, wna_named_after_wikidata_cod)
SELECT DISTINCT
	REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', ''),
	REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
WHERE LEFT(value->'namedAfter'->>'value', 31) = 'http://www.wikidata.org/entity/';
