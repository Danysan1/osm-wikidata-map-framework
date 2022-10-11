UPDATE oem.osmdata
SET osm_has_text_etymology = TRUE
WHERE osm_tags ? 'name:etymology'
OR osm_tags ? 'name:etymology:description'
