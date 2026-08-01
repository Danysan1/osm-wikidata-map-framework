SELECT pg_catalog.setval(pg_get_serial_sequence('owmf.osmdata', 'osm_id'), MAX(osm_id)) FROM owmf.osmdata;
