INSERT INTO owmf.osmdata (osm_geometry, osm_wd_id)
SELECT ST_GeomFromText(ws_location, 4326), wd_id
FROM owmf.wikidata_staging
JOIN owmf.wikidata ON wd_wikidata_cod = ws_item_qid
LEFT JOIN owmf.osmdata ON osm_wd_id = wd_id
WHERE osm_id IS NULL -- Only insert items that are not already in the table
AND ws_location ILIKE 'POINT%'
ON CONFLICT (osm_osm_type, osm_osm_id, osm_wd_id) DO NOTHING;
