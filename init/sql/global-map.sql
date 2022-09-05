CREATE MATERIALIZED VIEW oem.vm_global_map AS
SELECT
    ST_ReducePrecision(ST_Centroid(el_geometry), 0.1) AS geom,
    COUNT(DISTINCT COALESCE(el_tags->>'name', el_id::TEXT)) AS num
FROM oem.element
GROUP BY geom;
