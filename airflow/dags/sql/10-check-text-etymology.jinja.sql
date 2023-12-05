UPDATE owmf.osmdata
SET osm_has_text_etymology = TRUE
WHERE osm_tags ? '{{var.value.osm_text_key}}'
OR osm_tags ? '{{var.value.osm_description_key}}'
