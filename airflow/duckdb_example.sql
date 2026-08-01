COPY(
    SELECT geom, id, name, name_en, P373, P138, P547, P825, P17, P31, P131
    FROM 'https://wikidata-geo-dumps.toolforge.org/dumps/2026-07-21/wikidata_geo.parquet'
    WHERE list_contains(P17, 'Q38')
    AND (P138 IS NOT NULL OR P825 IS NOT NULL OR P547 IS NOT NULL)
) TO 'italy.csv' (FORMAT CSV, HEADER TRUE, DELIMITER ',', QUOTE '"', ESCAPE '"', NULL 'NULL');