# https://stackoverflow.com/a/43267603/2347196
set -a
source .env
set +a
export AIRFLOW_VAR_SOURCE_PRESETS="$NEXT_PUBLIC_OWMF_source_presets"
export AIRFLOW_VAR_OSM_FILTER_TAGS="$NEXT_PUBLIC_OWMF_osm_filter_tags"
export AIRFLOW_VAR_OSM_TEXT_KEY="$NEXT_PUBLIC_OWMF_osm_text_key"
export AIRFLOW_VAR_OSM_DESCRIPTION_KEY="$NEXT_PUBLIC_OWMF_osm_description_key"
export AIRFLOW_VAR_DEFAULT_LANGUAGE="$owmf_default_language"
export AIRFLOW_VAR_OSM_WIKIDATA_KEYS="$NEXT_PUBLIC_OWMF_osm_wikidata_keys"
export AIRFLOW_VAR_OSM_WIKIDATA_PROPERTIES="$NEXT_PUBLIC_OWMF_osm_wikidata_properties"

# https://airflow.apache.org/docs/apache-airflow/3.3.0/start.html
export AIRFLOW_HOME="$(pwd)"
airflow version
airflow standalone
