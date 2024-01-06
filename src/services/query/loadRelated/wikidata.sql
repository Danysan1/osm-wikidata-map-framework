INSERT INTO owmf.wikidata (
    wd_wikidata_cod, wd_alias_cod, wd_name_da, wd_name_de, wd_name_en, wd_name_es, wd_name_fr, wd_name_it, wd_commons
)
SELECT DISTINCT
    REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', ''), 
    REPLACE(value->'alias'->>'value', 'http://www.wikidata.org/entity/', ''),
    value->'label_da'->>'value',
    value->'label_de'->>'value',
    value->'label_en'->>'value',
    value->'label_es'->>'value',
    value->'label_fr'->>'value',
    value->'label_it'->>'value',
    'Category:' || (value->'commons'->>'value')
FROM json_array_elements(($1::JSON)->'results'->'bindings')
WHERE value->'item'->>'value' ^@ 'http://www.wikidata.org/entity/'
UNION
SELECT DISTINCT
    REPLACE(value->'etymology'->>'value', 'http://www.wikidata.org/entity/', ''), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
FROM json_array_elements(($1::JSON)->'results'->'bindings')
WHERE value->'etymology'->>'value' ^@ 'http://www.wikidata.org/entity/'
ON CONFLICT (wd_wikidata_cod) DO NOTHING