INSERT INTO wikidata (wd_wikidata_cod)
SELECT val
FROM (
	SELECT REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '') as val
	FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
	UNION
	SELECT ew_wikidata_cod FROM element_wikidata_cods
) AS x
WHERE LEFT(val,1)='Q';

INSERT INTO wikidata_named_after (wna_wd_id, wna_named_after_wd_id)
SELECT DISTINCT w1.wd_id, w2.wd_id
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings')
JOIN wikidata AS w1 ON w1.wd_wikidata_cod = REPLACE(value->'element'->>'value', 'http://www.wikidata.org/entity/', '')
JOIN wikidata AS w2 ON w2.wd_wikidata_cod = REPLACE(value->'namedAfter'->>'value', 'http://www.wikidata.org/entity/', '')
WHERE LEFT(value->'namedAfter'->>'value', 31) = 'http://www.wikidata.org/entity/';
