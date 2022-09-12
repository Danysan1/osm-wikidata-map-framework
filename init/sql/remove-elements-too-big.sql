DELETE FROM oem.osmdata
WHERE ST_Area(osm_geometry) >= 0.01