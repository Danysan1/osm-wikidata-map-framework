CREATE INDEX osmdata_tags_idx ON owmf.osmdata USING GIN (osm_tags);
