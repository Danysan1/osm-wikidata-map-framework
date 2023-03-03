CREATE INDEX osmdata_tags_idx ON oem.osmdata USING GIN (osm_tags);
