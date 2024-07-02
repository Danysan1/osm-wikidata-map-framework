INSERT INTO owmf.wikidata (
    wd_wikidata_cod, wd_alias_cod, wd_pseudo_tags
)
SELECT
    REPLACE(value->'item'->>'value', 'http://www.wikidata.org/entity/', ''), 
    REPLACE(value->'alias'->>'value', 'http://www.wikidata.org/entity/', ''),
    JSONB_BUILD_OBJECT(
            'name:da', value->'label_da'->>'value',
            'name:de', value->'label_de'->>'value',
            'name:en', value->'label_en'->>'value',
            'name:es', value->'label_es'->>'value',
            'name:fr', value->'label_fr'->>'value',
            'name:it', value->'label_it'->>'value',
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