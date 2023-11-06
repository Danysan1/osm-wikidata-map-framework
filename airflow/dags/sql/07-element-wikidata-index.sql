CREATE INDEX element_wikidata_from_osm_idx ON owmf.element_wikidata_cods (ew_from_osm,ew_wikidata_cod) WITH (fillfactor='100')
