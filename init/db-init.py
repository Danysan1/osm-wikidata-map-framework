import os
from datetime import datetime
from airflow.models import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.models.taskinstance import TaskInstance
from airflow.operators.python import BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.ssh.operators.ssh import SshOperator

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = os.path.dirname(os.path.abspath(__file__))
    if folder != None:
        file_dir_path = os.path.join(file_dir_path, folder)
    return os.path.join(file_dir_path, filename)

class PostgresCopyOperator(PythonOperator):
    def __init__(self, task_id:str, postgres_conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list, dag:DAG) -> None:
        super().__init__(
            task_id = task_id,
            python_callable = self.do_postgres_copy,
            op_kwargs = {
                "postgres_conn_id": postgres_conn_id,
                "filepath": filepath,
                "separator": separator,
                "schema": schema,
                "table": table,
                "columns": columns,
            },
            dag = dag,
        )

    def do_postgres_copy(postgres_conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list) -> None:
        """
        See https://www.psycopg.org/docs/usage.html#copy
        See https://www.psycopg.org/docs/cursor.html#cursor.copy_from
        See https://github.com/psycopg/psycopg2/issues/1294
        """
        pg_hook = PostgresHook(postgres_conn_id)
        with pg_hook.get_conn() as pg_conn:
            with pg_conn.cursor() as cursor:
                with open(filepath) as file:
                    cursor.execute(f'SET search_path TO {schema}')
                    cursor.copy_from(file, table, separator, columns = columns)

class OsmiumTagsFilterOperator(SshOperator):
    def __init__(self, task_id:str, ssh_conn_id:str, source_path:str, dest_path:str, tags:list, dag:DAG, invert_match:bool = False, remove_tags:bool = False) -> None:
        invert_match_str = "--invert-match" if invert_match else ""
        remove_tags_str = "--remove-tags" if remove_tags else ""
        super().__init__(
            task_id = task_id,
            ssh_conn_id = ssh_conn_id,
            command = 'osmium tags-filter --verbose --input-format=pbf --output-format=pbf {{ invert_match_str }} {{ remove_tags }} -o "$destPath" "$sourcePath" $quoted_tags',
            environment = {
                "sourcePath": source_path,
                "destPath": dest_path,
                "quoted_tags": ' '.join(map(lambda tag: f"'{tag}'", tags))
            },
            dag = dag,
        )

class OsmiumExportOperator(SshOperator):
    def __init__(self, ssh_conn_id:str, source_path:str, dest_path:str, config_path:str, dag:DAG, ti:TaskInstance) -> None:
        super().__init__(
            ssh_conn_id = ssh_conn_id,
            command = 'osmium export --verbose --overwrite -o "$destPath" -f "pg" --config="$configPath" --add-unique-id="counter" --index-type=$osmiumCache --show-errors "$sourcePath"',
            environment = {
                "sourcePath": source_path,
                "destPath": dest_path,
                "configPath": config_path,
                "osmiumCache": "sparse_file_array,/tmp/osmium_cache_{{ ti.run_id }}",
            },
            dag = dag,
        )

def get_last_pbf_url(pbf_url:str, rss_url:str, html_url:str, html_prefix:str, ti:TaskInstance) -> str:
    if pbf_url:
        print("Using 'pbf_url' as source URL: ", pbf_url)
        source_url = pbf_url
    elif rss_url and rss_url.endswith(".xml"):
        print("Fetching the source URL from 'rss_url':", rss_url)
        import urllib.request
        import xml.etree.ElementTree as ET
        with urllib.request.urlopen(rss_url) as response:
            xml_content = response.read()
            tree = ET.fromstring(xml_content)
            root = tree.getroot()
            channel = root.find('channel')
            item = channel.find('item')
            link = item.find('link')
            source_url = link.text
    elif html_url and html_prefix:
        print("Fetching the source URL from 'html_url':", html_url)
        source_url = ""
    else:
        print("Unable to get the source URL")
    
    if not isinstance(source_url, str) or not source_url.endswith(".osm.pbf"):
        raise Exception("The source url must be an OSM pbf file or as RSS for one", source_url)
    
    # https://linuxhint.com/fetch-basename-python/
    basename = os.path.basename(source_url)
    source_file_path = get_absolute_path(basename, 'pbf')
    filtered_with_flags_tags_file_path = f"/tmp/filtered_with_flags_tags_{basename}"
    filtered_with_flags_name_tags_file_path = f"/tmp/filtered_with_flags_name_tags_{basename}"
    filtered_file_path = f"/tmp/filtered_{basename}"
    relative_pg_file_path = f"pbf/{basename}.pg"
    absolute_pg_file_path = get_absolute_path(relative_pg_file_path)
    
    ti.xcom_push(key='source_url', value=source_url)
    ti.xcom_push(key='basename', value=basename)
    ti.xcom_push(key='source_file_path', value=source_file_path)
    ti.xcom_push(key='filtered_possible_file_path', value=filtered_with_flags_tags_file_path)
    ti.xcom_push(key='filtered_name_file_path', value=filtered_with_flags_name_tags_file_path)
    ti.xcom_push(key='filtered_file_path', value=filtered_file_path)
    ti.xcom_push(key='relative_pg_file_path', value=relative_pg_file_path)
    ti.xcom_push(key='absolute_pg_file_path', value=absolute_pg_file_path)

def define_db_init_dag(
        dag_id:str, schedule_interval:str, upload_db_conn_id:str, default_args:dict
    ):
    """
    See https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html
    """

    local_db_conn_id = "oem-postgis-conn"
    local_osmium_conn_id = "oem-web-dev-conn"

    dag = DAG(
            dag_id = dag_id,
            schedule_interval = schedule_interval,
            start_date=datetime(year=2022, month=2, day=1),
            catchup=False,
            tags=['oem', 'db-init'],
            params=default_args,
        )

    task_get_source_url = PythonOperator(
        task_id = "get_source_url",
        python_callable = get_last_pbf_url,
        op_kwargs = {
            "pbf_url": "{{ params.pbf_url if 'pbf_url' in params else '' }}",
            "rss_url": "{{ params.rss_url if 'rss_url' in params else '' }}",
            "html_url": "{{ params.html_url if 'html_url' in params else '' }}",
            "html_prefix": "{{ params.html_prefix if 'html_prefix' in params else '' }}",
        },
        do_xcom_push = True,
        dag = dag,
    )

    task_download_pbf = BashOperator(
        task_id = "download_pbf",
        bash_command = 'curl --fail -z "$sourceFilePath" -o "$sourceFilePath" "$url"',
        env = {
            "sourceFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
            "url": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
        },
        dag = dag,
    )
    task_get_source_url >> task_download_pbf

    task_keep_possible_ety = OsmiumTagsFilterOperator(
        task_id="keep_elements_with_possible_etymology",
        ssh_conn_id= local_osmium_conn_id,
        source_path= "",
        dest_path= "",
        tags=[
            'w/highway=residential',
            'w/highway=unclassified',
            'wikidata',
            'name:etymology:wikidata',
            'name:etymology',
            'subject:wikidata'
        ],
        remove_tags= True,
        dag=dag,
    )
    task_download_pbf >> task_keep_possible_ety

    task_keep_name = OsmiumTagsFilterOperator(
        task_id="keep_elements_with_name",
        ssh_conn_id= local_osmium_conn_id,
        source_path= "",
        dest_path= "",
        tags=['name'],
        dag=dag,
    )
    task_keep_possible_ety >> task_keep_name

    task_remove_non_interesting = OsmiumTagsFilterOperator(
        task_id="remove_non_interesting_elements",
        ssh_conn_id= local_osmium_conn_id,
        source_path= "",
        dest_path= "",
        tags=[
            'man_made=flagpole',
            'n/place=region',
            'n/place=state',
            'n/place=country',
            'n/place=continent',
            'r/admin_level=4',
            'r/admin_level=3',
            'r/admin_level=2'
        ],
        invert_match= True,
        dag=dag,
    )
    task_keep_name >> task_remove_non_interesting

    task_osmium_or_osm2pgsql = BranchPythonOperator(task_id="choose_osmium_or_osm2pgsql", python_callable=lambda:"export_pbf_to_pg")
    task_remove_non_interesting >> task_osmium_or_osm2pgsql

    task_export_pbf_to_pg = OsmiumExportOperator(
        task_id="export_pbf_to_pg",
        ssh_conn_id= local_osmium_conn_id,
        source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_file_path') }}",
        dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='relative_pg_file_path') }}",
        config_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='osmium.json') }}"
    )
    task_osmium_or_osm2pgsql >> task_export_pbf_to_pg

    task_setup_db_ext = PostgresOperator(
        task_id = "setup_db_extensions",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/setup-db-extensions.sql",
        dag = dag,
    )

    task_teardown_schema = PostgresOperator(
        task_id = "teardown_schema",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/teardown-schema.sql",
        dag = dag,
    )
    task_setup_db_ext >> task_teardown_schema

    task_setup_schema = PostgresOperator(
        task_id = "setup_schema",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/setup-schema.sql",
        dag = dag,
    )
    task_teardown_schema >> task_setup_schema

    task_load_ele_pg = PostgresCopyOperator(
        task_id = "load_elements_from_pg_file",
        postgres_conn_id = local_db_conn_id,
        filepath = "{{ ti.xcom_pull(task_ids='get_source_url', key='pg_file_path') }}",
        separator = '\t',
        schema = 'oem',
        table = 'osmdata',
        columns = ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"],
        dag = dag,
    )
    [task_export_pbf_to_pg, task_setup_schema] >> task_load_ele_pg

    task_load_ele_osm2pgsql = EmptyOperator(
        task_id = "load_elements_with_osm2pgsql",
        dag = dag,
    )
    [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_osm2pgsql

    task_remove_ele_too_big = PostgresOperator(
        task_id = "remove_elements_too_big",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/remove-elements-too-big.sql",
        dag = dag,
    )
    [task_load_ele_pg, task_load_ele_osm2pgsql] >> task_remove_ele_too_big

    task_convert_ele_wd_cods = PostgresOperator(
        task_id = "convert_element_wikidata_cods",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/convert-element-wikidata-cods.sql",
        dag = dag,
    )
    task_remove_ele_too_big >> task_convert_ele_wd_cods

    wikidata_init_file_path = get_absolute_path('wikidata_init.csv')
    task_load_wd_ent = PostgresCopyOperator(
        task_id = "load_wikidata_entities",
        postgres_conn_id = local_db_conn_id,
        filepath = wikidata_init_file_path,
        separator = ',',
        schema = 'oem',
        table = 'wikidata',
        columns = ["wd_wikidata_cod","wd_notes","wd_gender_descr","wd_gender_color","wd_type_descr","wd_type_color"],
        dag = dag,
    )
    task_setup_schema >> task_load_wd_ent

    task_convert_wd_ent = PostgresOperator(
        task_id = "convert_wikidata_entities",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/convert-wikidata-entities.sql",
        dag = dag,
    )
    [task_convert_ele_wd_cods, task_load_wd_ent] >> task_convert_wd_ent

    task_load_named_after = BashOperator(task_id="download_named_after_wikidata_entities", bash_command="date", dag=dag)
    task_convert_wd_ent >> task_load_named_after
    
    task_load_consists_of = BashOperator(task_id="download_consists_of_wikidata_entities", bash_command="date", dag=dag)
    task_convert_wd_ent >> task_load_consists_of

    task_convert_ety = PostgresOperator(
        task_id = "convert_etymologies",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/convert-etymologies.sql",
        dag = dag,
    )
    [task_load_named_after, task_load_consists_of] >> task_convert_ety

    task_propagate = PostgresOperator(
        task_id = "propagate_etymologies_globally",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/propagate-etymologies-global.sql",
        dag = dag,
    )
    task_convert_ety >> task_propagate

    task_check_text_ety = PostgresOperator(
        task_id = "check_text_etymology",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/check-text-etymology.sql",
        dag = dag,
    )
    task_propagate >> task_check_text_ety

    task_check_wd_ety = PostgresOperator(
        task_id = "check_wikidata_etymology",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/check-wd-etymology.sql",
        dag = dag,
    )
    task_check_text_ety >> task_check_wd_ety

    task_move_ele = PostgresOperator(
        task_id = "move_elements_with_etymology",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/move-elements-with-etymology.sql",
        dag = dag,
    )
    task_check_wd_ety >> task_move_ele

    task_setup_ety_fk = PostgresOperator(
        task_id = "setup_etymology_foreign_key",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/etymology-foreign-key.sql",
        dag = dag,
    )
    task_move_ele >> task_setup_ety_fk

    task_drop_temp_tables = PostgresOperator(
        task_id = "drop_temporary_tables",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/drop-temp-tables.sql",
        dag = dag,
    )
    task_move_ele >> task_drop_temp_tables

    task_global_map = PostgresOperator(
        task_id = "setup_global_map",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/global-map.sql",
        dag = dag,
    )
    task_move_ele >> task_global_map

    # https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior
    task_last_update = PostgresOperator(
        task_id = "save_last_data_update",
        postgres_conn_id = local_db_conn_id,
        sql = """
            CREATE OR REPLACE FUNCTION oem.last_data_update()
                RETURNS character varying
                LANGUAGE 'sql'
            AS $BODY$
            SELECT %(last_update)s;
            $BODY$;
            """,
        parameters = { "last_update": datetime.now().strftime('%y-%m-%d') },
        dag = dag,
    )
    task_setup_schema >> task_last_update

    task_pg_dump = BashOperator(task_id="pg_dump", bash_command="date", dag=dag)
    [task_setup_ety_fk, task_drop_temp_tables, task_global_map, task_last_update] >> task_pg_dump

    task_pg_restore = BashOperator(task_id="pg_restore", bash_command="date", dag=dag)
    task_pg_dump >> task_pg_restore

    return dag

planet = define_db_init_dag("db-init-planet", "@weekly", "oem-prod", { "rss_url": "https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-pbf-rss.xml" })
#planet = define_db_init_dag("db-init-planet", "@weekly", "oem-prod", { "pbf_url": "https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-latest.osm.pbf" })
nord_ovest = define_db_init_dag("db-init-nord-ovest", "@daily", "oem-prod-no", { "pbf_url": "http://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf" })
