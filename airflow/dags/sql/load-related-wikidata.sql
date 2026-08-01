INSERT INTO owmf.wikidata (wd_wikidata_cod, wd_alias_cod, wd_pseudo_tags)
SELECT
    ws_item_qid,
    ws_alias_qid,
    JSONB_BUILD_OBJECT(
            'name', ws_label,
            'name:en', ws_label_en,
            'wikimedia_commons', 'Category:' || ws_commons
        )
FROM owmf.wikidata_staging
UNION
SELECT DISTINCT ws_linked_entity_qid, NULL, NULL::JSONB
FROM owmf.wikidata_staging
ON CONFLICT (wd_wikidata_cod) DO NOTHING
