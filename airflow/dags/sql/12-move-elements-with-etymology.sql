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
    osm_tags,
    osm_has_text_etymology,
    SUBSTRING(osm_tags->>'wikidata' FROM '^(Q\d+)'),
    SUBSTRING(osm_tags->>'wikimedia_commons' FROM '^([^;]+)'),
    SUBSTRING(osm_tags->>'wikipedia' FROM '^([^;]+)')
FROM owmf.osmdata
LEFT JOIN owmf.etymology ON osm_id = et_el_id
WHERE osm_has_text_etymology
OR etymology.et_id IS NOT NULL
ON CONFLICT (el_id) DO NOTHING
