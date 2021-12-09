INSERT INTO wikidata (wd_wikidata_cod)
SELECT REPLACE(response->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings') AS response
WHERE REPLACE(response->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '') NOT IN ( SELECT wd_wikidata_cod FROM wikidata )
UNION
SELECT REPLACE(response->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings') AS response
WHERE REPLACE(response->'genderID'->>'value', 'http://www.wikidata.org/entity/', '') NOT IN ( SELECT wd_wikidata_cod FROM wikidata );

UPDATE wikidata
SET wd_position = CASE 
		WHEN response->'wkt_coords' IS NULL OR response->'wkt_coords'->>'value' IS NULL OR response->'wkt_coords'->>'value' = ''
		THEN NULL
		ELSE ST_GeomFromText(response->'wkt_coords'->>'value', 4326)
	END,
	--wd_event_date = translateTimestamp(response->'event_date'->>'value'),
	wd_event_date = response->'event_date'->>'value',
	wd_event_date_precision = (response->'event_date_precision'->>'value')::INT,
	--wd_start_date = translateTimestamp(response->'start_date'->>'value'),
	wd_start_date = response->'start_date'->>'value',
	wd_start_date_precision = (response->'start_date_precision'->>'value')::INT,
	--wd_end_date = translateTimestamp(response->'end_date'->>'value'),
	wd_end_date = response->'end_date'->>'value',
	wd_end_date_precision = (response->'end_date_precision'->>'value')::INT,
	--wd_birth_date = translateTimestamp(response->'birth_date'->>'value'),
	wd_birth_date = response->'birth_date'->>'value',
	wd_birth_date_precision = (response->'birth_date_precision'->>'value')::INT,
	--wd_death_date = translateTimestamp(response->'death_date'->>'value'),
	wd_death_date = response->'death_date'->>'value',
	wd_death_date_precision = (response->'death_date_precision'->>'value')::INT,
	wd_commons = response->'commons'->>'value',
	wd_instance_id = (SELECT wd_id FROM wikidata WHERE wd_wikidata_cod = REPLACE(response->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')),
	wd_gender_id = (SELECT wd_id FROM wikidata WHERE wd_wikidata_cod = REPLACE(response->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')),
	wd_download_date = CURRENT_TIMESTAMP
FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings') AS response
WHERE REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '') = wikidata.wd_wikidata_cod;

INSERT INTO wikidata_picture (wdp_wd_id, wdp_picture)
SELECT wd.wd_id, picture
FROM wikidata AS wd
JOIN (
	SELECT
		REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '') AS wikidata_cod,
		REGEXP_SPLIT_TO_TABLE(response->'pictures'->>'value', '`') AS picture
	FROM json_array_elements(('__WIKIDATA_JSON__'::JSON)->'results'->'bindings') AS response
) AS pic ON pic.wikidata_cod = wd.wd_wikidata_cod
WHERE picture IS NOT NULL AND picture != '';
