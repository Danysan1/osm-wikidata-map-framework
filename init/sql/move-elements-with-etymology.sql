INSERT INTO oem.element (
    el_id,
    el_geometry,
    el_osm_type,
    el_osm_id,
    el_tags,
    el_has_text_etymology,
    el_has_wd_etymology,
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
    osm_has_wd_etymology,
    SUBSTRING(osm_tags->>'wikidata' FROM '^([^;]+)'),
    SUBSTRING(osm_tags->>'wikimedia_commons' FROM '^([^;]+)'),
    SUBSTRING(osm_tags->>'wikipedia' FROM '^([^;]+)')
FROM oem.osmdata
WHERE osm_has_wd_etymology OR osm_has_text_etymology;
