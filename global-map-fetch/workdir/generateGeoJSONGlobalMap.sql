SELECT JSON_BUILD_OBJECT(
    'type', 'FeatureCollection',
    'features', JSON_AGG(ST_AsGeoJSON(point.*)::json)
    )
FROM (
	SELECT ST_SetSRID( ST_Point( min_lon+0.1, min_lat+0.1), 4326) AS geom, COUNT(DISTINCT ele.*) AS count
	FROM (
		SELECT min_lon, min_lat, ST_MakeEnvelope(min_lon, min_lat, min_lon+0.2, min_lat+0.2, 4326) AS bbox
		FROM GENERATE_SERIES(-180, 180, 0.2) AS min_lon, GENERATE_SERIES(-90, 90, 0.2) AS min_lat
	) AS meshGrid
	JOIN planet_osm_point AS ele ON way @ bbox
	--JOIN element AS ele ON geometry @ bbox
	GROUP BY min_lon, min_lat
	HAVING COUNT(*) > 0
) AS point
