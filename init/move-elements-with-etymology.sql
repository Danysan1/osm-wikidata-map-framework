INSERT INTO oem.element (
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
    :load_text_etymology::BOOLEAN AND osm_tags ?? 'name:etymology',
    SUBSTRING(osm_tags->>'wikidata' FROM '^([^;]+)'),
    SUBSTRING(osm_tags->>'wikimedia_commons' FROM '^([^;]+)'),
    SUBSTRING(osm_tags->>'wikipedia' FROM '^([^;]+)')
FROM oem.osmdata
WHERE osm_id IN (SELECT DISTINCT et_el_id FROM oem.etymology)
OR (:load_text_etymology::BOOLEAN AND osm_tags ?? 'name:etymology');
