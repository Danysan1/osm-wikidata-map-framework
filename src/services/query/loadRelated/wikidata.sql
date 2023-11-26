INSERT INTO owmf.wikidata (wd_wikidata_cod)
SELECT DISTINCT REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(($1::JSON)->'results'->'bindings')
WHERE value->'item'->>'value' LIKE 'http://www.wikidata.org/entity/%'
UNION
SELECT DISTINCT REPLACE(value->'etymology'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(($1::JSON)->'results'->'bindings')
WHERE value->'etymology'->>'value' LIKE 'http://www.wikidata.org/entity/%'
ON CONFLICT (wd_wikidata_cod) DO NOTHING