SELECT JSON_BUILD_OBJECT(
    'type', 'FeatureCollection',
    'features', JSON_AGG(ST_AsGeoJSON(point.*)::json)
    )
FROM (
	SELECT
		ST_SetSRID( ST_Point( min_lon+0.025, min_lat+0.025), 4326) AS geom,
		(
		SELECT COUNT(*) FROM planet_osm_point WHERE osm_id IN (SELECT et_osm_id FROM etymology WHERE et_type='point') AND way @ bbox
		) + (
		SELECT COUNT(*) FROM planet_osm_line WHERE osm_id IN (SELECT et_osm_id FROM etymology WHERE et_type='line') AND way @ bbox
		) + (
		SELECT COUNT(*) FROM planet_osm_point WHERE osm_id IN (SELECT et_osm_id FROM etymology WHERE et_type='polygon') AND way @ bbox
		) AS ety_count
	FROM (
		SELECT min_lon, min_lat, ST_MakeEnvelope(min_lon, min_lat, min_lon+0.05, min_lat+0.05, 4326) AS bbox
		FROM GENERATE_SERIES(-180, 180, 0.05) AS min_lon, GENERATE_SERIES(-90, 90, 0.05) AS min_lat
	) AS meshGrid
	GROUP BY meshGrid.min_lon, meshGrid.min_lat, meshGrid.bbox
) AS point
WHERE ety_count > 0
