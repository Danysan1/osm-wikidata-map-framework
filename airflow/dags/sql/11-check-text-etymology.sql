UPDATE oem.osmdata
SET osm_has_text_etymology = TRUE
WHERE osm_tags ? %(text_key)s
OR osm_tags ? %(description_key)s
