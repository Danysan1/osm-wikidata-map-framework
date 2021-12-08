SELECT JSON_BUILD_OBJECT(
    'type', 'FeatureCollection',
    'features', JSON_AGG(ST_AsGeoJSON(point.*)::json)
    )
FROM (
	SELECT
		ST_SetSRID( ST_Point( min_lon+0.01, min_lat+0.01), 4326) AS geom,
		(
			SELECT COUNT(DISTINCT et_el_id)
			FROM etymology
			JOIN element ON et_el_id = el_id
			WHERE el_geometry @ ST_MakeEnvelope(min_lon, min_lat, min_lon+0.02, min_lat+0.02, 4326)
		) AS ety_count
	FROM GENERATE_SERIES(-180, 180, 0.02) AS min_lon, GENERATE_SERIES(-55, 70, 0.02) AS min_lat
) AS point
WHERE ety_count > 0
