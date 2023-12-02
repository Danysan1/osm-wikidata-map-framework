INSERT INTO owmf.element_wikidata_cods (ew_el_id, ew_wikidata_cod, ew_from_key_id)
{% for osm_key in var.json.osm_wikidata_keys %}
{% if loop.index != 1 %}UNION{% endif %}
SELECT osm_id, UPPER(TRIM(etymology_wikidata_cod)), 'osm_{{osm_key.replace(":wikidata","").replace(":","_")}}'
FROM owmf.osmdata, LATERAL REGEXP_SPLIT_TO_TABLE(osm_tags->>'{{osm_key}}',';') AS splitted(etymology_wikidata_cod)
WHERE osm_tags ? '{{osm_key}}'
AND TRIM(etymology_wikidata_cod) ~* '^Q\d+$'
{% endfor %}
