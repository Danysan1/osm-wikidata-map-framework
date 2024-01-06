INSERT INTO owmf.element (
    el_id,
    el_geometry,
    el_osm_type,
    el_osm_id,
    el_tags,
    el_has_text_etymology,
    el_wikidata_cod,
    el_commons,
    el_wikipedia
) SELECT 
    osm_id,
    osm_geometry,
    osm_osm_type,
    osm_osm_id,
    JSONB_BUILD_OBJECT(
            'name:da', wd_name_da,
            'name:de', wd_name_de,
            'name:en', wd_name_en,
            'name:es', wd_name_es,
            'name:fr', wd_name_fr,
            'name:it', wd_name_it,
            'wikimedia_commons', wd_commons
        ) || osm_tags,
    osm_has_text_etymology,
    wd_wikidata_cod,
    COALESCE(
        SUBSTRING(osm_tags->>'wikimedia_commons' FROM '^([^;]+)'),
        SUBSTRING(osm_tags->>'image' FROM '(File:[^;]+)')
    ),
    SUBSTRING(osm_tags->>'wikipedia' FROM '^([^;]+)')
FROM owmf.osmdata
LEFT JOIN owmf.wikidata ON osm_wd_id = wd_id
LEFT JOIN owmf.etymology ON osm_id = et_el_id
WHERE osm_has_text_etymology
OR etymology.et_id IS NOT NULL
ON CONFLICT (el_id) DO NOTHING
