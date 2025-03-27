INSERT INTO owmf.wikidata (
    wd_wikidata_cod, wd_alias_cod, wd_pseudo_tags
)
SELECT
    REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', ''), 
    REPLACE(value->'alias'->>'value', 'http://www.wikidata.org/entity/', ''),
    JSONB_BUILD_OBJECT(
            'name', value->'label_mul'->>'value',
            'name:en', value->'label_en'->>'value',
            'wikimedia_commons', 'Category:' || (value->'commons'->>'value')
        )
FROM json_array_elements(($1::JSON)->'results'->'bindings')
WHERE value->'item'->>'value' ^@ 'http://www.wikidata.org/entity/'
UNION
SELECT DISTINCT
    REPLACE(value->'etymology'->>'value', 'http://www.wikidata.org/entity/', ''), NULL, NULL::JSONB
FROM json_array_elements(($1::JSON)->'results'->'bindings')
WHERE value->'etymology'->>'value' ^@ 'http://www.wikidata.org/entity/'
ON CONFLICT (wd_wikidata_cod) DO NOTHING