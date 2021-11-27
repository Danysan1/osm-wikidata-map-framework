DROP MATERIALIZED VIEW IF EXISTS public."element";
CREATE MATERIALIZED VIEW public."element" AS
SELECT *
FROM (
  SELECT
    'node' AS osm_type,
    osm_id,
    name,
    tags->'wikidata' AS wikidata_id,
    tags->'subject' AS subject,
    tags->'subject:wikidata' AS subject_wikidata_id,
    tags->'name:etymology' AS etymology,
    tags->'name:etymology:wikidata' AS etymology_wikidata_id,
    way AS geometry
  FROM public."planet_osm_point" AS point
  UNION
  SELECT
    'way' AS osm_type,
    osm_id,
    name,
    tags->'wikidata' AS wikidata_id,
    tags->'subject' AS subject,
    tags->'subject:wikidata' AS subject_wikidata_id,
    tags->'name:etymology' AS etymology,
    tags->'name:etymology:wikidata' AS etymology_wikidata_id,
    way AS geometry
  FROM public."planet_osm_line" AS way
  UNION
  SELECT
    'relation' AS osm_type,
    osm_id,
    name,
    tags->'wikidata' AS wikidata_id,
    tags->'subject' AS subject,
    tags->'subject:wikidata' AS subject_wikidata_id,
    tags->'name:etymology' AS etymology,
    tags->'name:etymology:wikidata' AS etymology_wikidata_id,
    way AS geometry
  FROM public."planet_osm_line" AS rel
) AS ele
LEFT JOIN public."wikidata_named_after" AS wna
  ON wna.wna_wikidata_id = ele.wikidata_id
LEFT JOIN public."wikidata" AS wd
  ON wd.wd_wikidata_id = ele.subject_wikidata_id
  OR wd.wd_wikidata_id = ele.etymology_wikidata_id
  OR wd.wd_wikidata_id = wna.wna_named_after_wikidata_id
WHERE wd.wd_id IS NOT NULL
OR ele.etymology IS NOT NULL
OR ele.subject IS NOT NULL;