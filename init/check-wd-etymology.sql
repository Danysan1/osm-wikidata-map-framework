UPDATE oem.osmdata
SET osm_has_wd_etymology = TRUE
WHERE osm_id IN (SELECT DISTINCT et_el_id FROM oem.etymology);
