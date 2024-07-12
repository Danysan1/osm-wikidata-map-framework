INSERT INTO owmf.element (
    el_id,
    el_geometry,
    el_osm_type,
    el_osm_id,
    el_tags,
    el_is_boundary,
    el_wikidata_cod,
    el_commons,
    el_wikipedia
) SELECT 
    osm_id,
    osm_geometry,
    osm_osm_type,
    osm_osm_id,
    COALESCE(wd_pseudo_tags||osm_tags, osm_tags, wd_pseudo_tags), -- https://stackoverflow.com/a/44038002/2347196
    osm_tags IS NOT NULL AND osm_tags ? 'type' AND (
        osm_tags ? 'boundary' OR
        osm_tags->>'type' = 'boundary' OR
        (osm_tags->>'type' = 'multipolygon' AND osm_tags ? 'place' AND (osm_tags->>'place' = 'region' OR osm_tags->>'place' = 'sea' OR osm_tags->>'place' = 'island'))
    ),
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
