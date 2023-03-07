CREATE INDEX etymology_source_idx ON oem.etymology USING GIN (et_from_key_ids);
