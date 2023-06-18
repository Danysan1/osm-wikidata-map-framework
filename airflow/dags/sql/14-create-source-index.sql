CREATE INDEX etymology_source_idx ON owmf.etymology USING GIN (et_from_key_ids);
