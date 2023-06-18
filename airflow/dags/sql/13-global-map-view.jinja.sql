CREATE MATERIALIZED VIEW IF NOT EXISTS owmf.vm_global_map AS
SELECT
    ST_ReducePrecision(ST_Centroid(el_geometry), 0.3) AS geom,
    COUNT(DISTINCT LOWER(el_tags->>'name')) AS num
FROM owmf.element
GROUP BY geom
HAVING COUNT(DISTINCT LOWER(el_tags->>'name')) > {{var.value.global_map_threshold}}
