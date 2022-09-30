UPDATE oem.osmdata
SET osm_has_wd_etymology = TRUE
FROM oem.etymology
WHERE osm_id = et_el_id
