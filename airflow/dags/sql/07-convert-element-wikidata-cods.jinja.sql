INSERT INTO oem.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_from_osm, ew_from_key_id)
SELECT osm_id, UPPER(TRIM(wikidata_cod)), FALSE, 'osm_wikidata'
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'wikidata',';') AS splitted(wikidata_cod)
WHERE osm_tags ? 'wikidata'
AND TRIM(wikidata_cod) ~* '^Q\d+$'
{% for osm_key in var.json.osm_wikidata_keys %}
UNION
SELECT osm_id, UPPER(TRIM(etymology_wikidata_cod)), TRUE, 'osm_{{osm_key.replace(":wikidata","").replace(":","_")}}'
FROM oem.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'{{osm_key}}',';') AS splitted(etymology_wikidata_cod)
WHERE osm_tags ? '{{osm_key}}'
AND TRIM(etymology_wikidata_cod) ~* '^Q\d+$'
{% endfor %}