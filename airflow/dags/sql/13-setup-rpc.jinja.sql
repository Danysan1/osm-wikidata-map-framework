-- https://maplibre.org/martin/33-sources-pg-functions.html
CREATE OR REPLACE
    FUNCTION owmf.etymology_map(zoom integer, x integer, y integer, query_params json)
    RETURNS bytea AS $$
DECLARE
  mvt bytea;
BEGIN
  SELECT INTO mvt ST_AsMVT(tile, 'etymology_map', 4096, 'geom') FROM (
    SELECT
        ST_AsMVTGeom(
            ST_Transform(ST_CurveToLine(el.el_geometry), 3857),
            ST_TileEnvelope(zoom, x, y),
            4096, 64, true
        ) AS geom,
        el.el_id,
        el.el_osm_type AS osm_type,
        el.el_osm_id AS osm_id,
        el.el_osm_id IS NOT NULL AS from_osm,
        el.el_osm_id IS NULL AS from_wikidata,
        COALESCE(
            el.el_tags->>CONCAT('name:', query_params->>'lang'),
            el.el_tags->>'name',
            -- Usually the name in the main language is in name=*, not in name:<main_language>=*, so using name:<default_launguage>=* before name=* would often hide the name in the main language
            el.el_tags->>'name:{{var.value.default_language}}'
        ) AS name,
        el.el_tags->>'alt_name' AS alt_name,
        el.el_tags->>'official_name' AS official_name,
        el.el_tags->>'{{var.value.osm_text_key}}' AS text_etymology,
        el.el_tags->>'{{var.value.osm_description_key}}' AS text_etymology_descr,
        el.el_commons AS commons,
        el.el_wikidata_cod AS wikidata,
        el.el_wikipedia AS wikipedia,
        JSON_AGG(JSON_BUILD_OBJECT(
            'from_osm', et_from_osm,
            'from_osm_type', from_el.el_osm_type,
            'from_osm_id', from_el.el_osm_id,
            'osm_wd_join_field', CASE WHEN et_from_osm_wikidata_wd_id IS NULL THEN NULL ELSE 'OSM' END,
            'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
            'from_wikidata_entity', from_wd.wd_wikidata_cod,
            'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
            'propagated', et_recursion_depth != 0,
            'wikidata', wd.wd_wikidata_cod
        )) AS etymologies
    FROM owmf.element AS el
    LEFT JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
    LEFT JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
    LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et.et_from_osm_wikidata_wd_id
    LEFT JOIN owmf.element AS from_el ON from_el.el_id = et.et_from_el_id
    WHERE el.el_geometry && ST_Transform(ST_TileEnvelope(zoom, x, y), 4326)
    AND (query_params->'source' IS NULL OR query_params->>'source' = 'all' OR query_params->>'source' = ANY(et.et_from_key_ids))
    AND (query_params->'search' IS NULL OR query_params->>'search' = wd.wd_wikidata_cod)
    GROUP BY el.el_id
  ) as tile WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;



CREATE OR REPLACE
    FUNCTION owmf.elements(zoom integer, x integer, y integer)
    RETURNS bytea AS $$
DECLARE
  mvt bytea;
BEGIN
  SELECT INTO mvt ST_AsMVT(tile, 'elements', 4096, 'geom') FROM (
    SELECT
        ST_AsMVTGeom(
            ST_Transform(ST_Centroid(ST_Collect(geom)), 3857),
            ST_TileEnvelope(zoom, x, y),
            4096, 64, true
        ) AS geom,
        SUM(el_num) AS el_num
    FROM owmf.vm_elements
    WHERE geom && ST_Transform(ST_TileEnvelope(zoom, x, y), 4326)
    GROUP BY ST_ReducePrecision(
      ST_Centroid(geom),
      64.835 - 17.6596 * zoom + 1.60667 * POWER(zoom,2) - 0.04875 * POWER(zoom,3) -- https://www.wolframalpha.com/input?i=interpolate+%7B%7B3%2C25%7D%2C+%7B9%2C0.5%7D%2C+%7B11%2C0.1%7D%2C+%7B12%2C0.04%7D%7D
    )
  ) as tile WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;
