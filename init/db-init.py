import os
from datetime import datetime
from airflow.models import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.models.taskinstance import TaskInstance
from airflow.operators.empty import EmptyOperator
from airflow.providers.docker.operators.docker import DockerOperator
from airflow.utils.trigger_rule import TriggerRule
from airflow.utils.task_group import TaskGroup
from docker.types import Mount
from airflow.utils.edgemodifier import Label
from airflow.providers.http.operators.http import SimpleHttpOperator

# https://www.astronomer.io/guides/logging/
#task_logger = logging.getLogger('airflow.task')

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = os.path.dirname(os.path.abspath(__file__))
    if folder != None:
        file_dir_path = os.path.join(file_dir_path, folder)
    return os.path.join(file_dir_path, filename)

class PostgresCopyOperator(PythonOperator):
    def __init__(self, postgres_conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list, **kwargs) -> None:
        super().__init__(
            python_callable = self.do_postgres_copy,
            op_kwargs = {
                "postgres_conn_id": postgres_conn_id,
                "filepath": filepath,
                "separator": separator,
                "schema": schema,
                "table": table,
                "columns": columns,
            },
            **kwargs
        )

    def do_postgres_copy(self, postgres_conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list) -> None:
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

class OsmiumTagsFilterOperator(DockerOperator):
    """
    Execute osmium tags-filter on a dedicated Docker container

    Links:
    * [osmium tags-filter documentation](https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html)
    * [osmium tags-filter documentation](https://manpages.ubuntu.com/manpages/jammy/man1/osmium-tags-filter.1.html)
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/stable/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, source_path:str, dest_path:str, tags:list, invert_match:bool = False, remove_tags:bool = False, **kwargs) -> None:
        invert_match_str = "--invert-match" if invert_match else ""
        remove_tags_str = "--remove-tags" if remove_tags else ""
        quoted_tags = ' '.join(map(lambda tag: f"'{tag}'", tags))
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image='beyanora/osmtools:20210401',
            command = f"osmium tags-filter --verbose --input-format=pbf --output-format=pbf {invert_match_str} {remove_tags_str} --output='{dest_path}' --overwrite '{source_path}' {quoted_tags}",
            mounts=[
                Mount(source="open-etymology-map_db-init-work-dir", target="/workdir", type="volume"),
            ],
            mount_tmp_dir=False,
            auto_remove=True,
            **kwargs
        )

class OsmiumExportOperator(DockerOperator):
    """
    Execute osmium export on a dedicated Docker container

    Links:
    * [osmium export documentation](https://docs.osmcode.org/osmium/latest/osmium-export.html)
    * [osmium export documentation](https://manpages.ubuntu.com/manpages/jammy/man1/osmium-export.1.html)
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/stable/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, source_path:str, dest_path:str, cache_path:str = None, config_path:str = None, **kwargs) -> None:
        cache_str = f"--index-type='sparse_file_array,{cache_path}'" if cache_path != None else ""
        config_str = f"--config='{config_path}'" if config_path != None else ""
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image='beyanora/osmtools:20210401',
            command = f"osmium export --verbose --overwrite -o '{dest_path}' -f 'pg' {config_str} --add-unique-id='counter' {cache_str} --show-errors '{source_path}'",
            mounts=[
                Mount(source="open-etymology-map_db-init-work-dir", target="/workdir", type="volume"),
            ],
            mount_tmp_dir=False,
            auto_remove=True,
            **kwargs
        )

class PgDumpOperator(BashOperator):
    """
    Execute pg_dump on the specified connection

    Links:
    * [pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
    * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
    * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/bash.html)
    """
    def __init__(self, postgres_conn_id:str, dest_path:str, **kwargs) -> None:
        postgres_conn = PostgresHook.get_connection(postgres_conn_id)
        super().__init__(
            bash_command='pg_dump --file="$backupFilePath" --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema="oem" --verbose --no-owner --no-privileges --no-tablespaces',
            env= {
                "backupFilePath": dest_path,
                "host": postgres_conn.host,
                "port": str(postgres_conn.port),
                "user": postgres_conn.login,
                "dbname": postgres_conn.schema,
                "PGPASSWORD": postgres_conn.password,
            },
            **kwargs
        )

class PgRestoreOperator(BashOperator):
    """
    Execute pg_restore on upload_db_conn_id

    Links:
    * [pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)
    * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
    * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/bash.html)
    * [Templates reference](https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html)
    """
    def __init__(self, src_path:str, **kwargs) -> None:
        super().__init__(
            bash_command='pg_restore --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --schema "oem" --verbose "$backupFilePath"',
            env= {
                "backupFilePath": src_path,
                "host": "{{ conn[params.upload_db_conn_id].host }}",
                "port": "{{ str(conn[params.upload_db_conn_id].port) }}",
                "user": "{{ conn[params.upload_db_conn_id].login }}",
                "dbname": "{{ conn[params.upload_db_conn_id].dbname }}",
                "PGPASSWORD": "{{ conn[params.upload_db_conn_id].password }}",
            },
            **kwargs
        )

class Osm2pgsqlOperator(DockerOperator):
    """
    Execute osmium export on a dedicated Docker container

    Links:
    * [osm2pgsql documentation](https://osm2pgsql.org/doc/manual.html)
    * [osm2pgsql documentation](https://manpages.ubuntu.com/manpages/jammy/en/man1/osm2pgsql.1.html)
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/stable/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, postgres_conn_id:str, source_path:str, **kwargs) -> None:
        postgres_conn = PostgresHook.get_connection(postgres_conn_id)
        host = postgres_conn.host
        port = postgres_conn.port
        user = postgres_conn.login
        db = postgres_conn.schema
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image='beyanora/osmtools:20210401',
            command = f"osm2pgsql --host='{host}' --port='{port}' --database='{db}' --user='{user}' --hstore-all --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 '{source_path}'",
            environment = {
                "PGPASSWORD": postgres_conn.password,
            },
            mounts=[
                Mount(source="open-etymology-map_db-init-work-dir", target="/workdir", type="volume"),
            ],
            network_mode="open-etymology-map_airflow-worker-bridge", # The container needs to talk with the local DB
            mount_tmp_dir=False,
            auto_remove=True,
            **kwargs
        )

def get_last_pbf_url(ti:TaskInstance, **context) -> str:
    from urllib.request import urlopen
    from re import search, findall

    params = context["params"]

    source_url = None
    if "pbf_url" in params and isinstance(params["pbf_url"],str) and params["pbf_url"]!="":
        pbf_url = params["pbf_url"]
        print("Using 'pbf_url' as source URL: ", pbf_url)
        source_url = pbf_url
    elif "rss_url" in params and isinstance(params["rss_url"],str) and params["rss_url"].endswith(".xml"):
        rss_url = params["rss_url"]
        print("Fetching the source URL from 'rss_url':", rss_url)
        from xml.etree.ElementTree import fromstring
        with urlopen(rss_url) as response:
            xml_content = response.read()
            tree = fromstring(xml_content)
            root = tree.getroot()
            channel = root.find('channel')
            item = channel.find('item')
            link = item.find('link')
            source_url = link.text
    elif "html_url" in params and isinstance(params["html_url"],str) and params["html_url"]!="" and "html_prefix" in params and isinstance(params["html_prefix"],str) and params["html_prefix"]!="":
        html_url = params["html_url"]
        html_prefix = params["html_prefix"]
        print("Fetching the source URL from 'html_url':", html_url, html_prefix)
        with urlopen(html_url) as response:
            html_content = response.read().decode('utf-8')
            search_result = findall('href="([\w-]+[\d+].osm.pbf)"', html_content)
            print("Search result:", search_result)

            files = list(filter(lambda s: s.startswith(html_prefix), search_result))
            files.sort(reverse=True)
            print("Files found:", files)

            if files != None and len(files) > 0:
                source_url = f"{html_url}/{files[0]}"
    else:
        print("Unable to get the source URL", params)
    
    if isinstance(source_url, str) and source_url.endswith(".osm.pbf"):
        print("Using URL:", source_url)
    else:
        raise Exception("The source url must be an OSM pbf file or as RSS for one", source_url)
    
    # https://linuxhint.com/fetch-basename-python/
    basename = os.path.basename(source_url)

    date_match = search('-(\d{2})(\d{2})(\d{2})\.', basename)
    if date_match != None:
        last_data_update = f'20{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'
    else:
        last_data_update = datetime.now().strftime('%y-%m-%d')
    
    ti.xcom_push(key='source_url', value=source_url)
    ti.xcom_push(key='basename', value=basename)
    ti.xcom_push(key='source_file_path', value=f"/workdir/{basename}")
    ti.xcom_push(key='filtered_name_file_path', value=f"/workdir/filtered_name_{basename}")
    ti.xcom_push(key='filtered_possible_file_path', value=f"/workdir/filtered_possible_{basename}")
    ti.xcom_push(key='filtered_file_path', value=f"/workdir/filtered_{basename}")
    ti.xcom_push(key='pg_file_path', value=f"/workdir/{basename}.pg")
    ti.xcom_push(key='backup_file_path', value=f"/workdir/{basename}.backup")
    ti.xcom_push(key='last_data_update', value=last_data_update)

def do_copy_file(source_path:str, dest_path:str) -> None:
    """
    Copy a file from one path to another
    """
    from shutil import copyfile
    copyfile(source_path, dest_path)

def check_upload_db_conn_id(**context):
    p = context["params"]
    return "upload_db_conn_id" in p and isinstance(p["upload_db_conn_id"], str) and p["upload_db_conn_id"]!=""

def choose_load_osm_data_task(**context):
    p = context["params"]
    use_osm2pgsql = "use_osm2pgsql" in p and p["use_osm2pgsql"]
    task_id = "load_elements_with_osm2pgsql" if use_osm2pgsql else "copy_osmium_export_config"
    return f"load_osm_data.{task_id}"

class OemDbInitDAG(DAG):
    def __init__(self, upload_db_conn_id:str=None, pbf_url:str=None, rss_url:str=None, html_url:str=None, html_prefix:str=None, use_osm2pgsql:bool=False, **kwargs):
        """
        DAG for Open Etymology Map DB initialization

        Parameters:
        ----------
        dag_id: str
            dag_id of the generated DAG
        schedule_interval: str
            schedule_interval of the generated DAG
        upload_db_conn_id: str
            Postgres connection ID for the production Database the DAG will upload to
        pbf_url: str
            URL to the PBF file
        rss_url: str
            URL to the RSS file listing PBF files
        html_url: str
            URL to the HTML file listing PBF files
        html_prefix: str
            prefix to search in the PBF filename 
        use_osm2pgsql: bool
            use osm2pgsql instead of osmium export

        See https://airflow.apache.org/docs/apache-airflow/stable/index.html
        """

        super().__init__(
                start_date=datetime(year=2022, month=2, day=1),
                catchup=False,
                tags=['oem', 'db-init'],
                params={
                    "pbf_url": pbf_url,
                    "rss_url": rss_url,
                    "html_url": html_url,
                    "html_prefix": html_prefix,
                    "upload_db_conn_id": upload_db_conn_id,
                    "use_osm2pgsql": use_osm2pgsql,
                },
                doc_md="""
                    # Open Etymology Map DB initialization

                    * downloads and and filters OSM data
                    * downloads relevant OSM data
                    * combines OSM and Wikidata data
                    * uploads the output to the production DB.

                    Documentation in the task descriptions and in the [project's CONTRIBUTIG.md](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md).
                """,
                **kwargs
            )
            
        local_db_conn_id = "oem-postgis-postgres"
        local_web_conn_id = "oem-web-dev-http"

        task_get_source_url = PythonOperator(
            task_id = "get_source_url",
            python_callable = get_last_pbf_url,
            do_xcom_push = True,
            dag = self,
            doc_md = """
                # Get PBF file URL

                Gets the PBF file URL starting from the parameters pbf_url/rss_url/html_url/html_prefix.

                The URL parameters are passed through the params object to allow customization when triggering the DAG.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/python.html)
                * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html)
            """
        )

        task_download_pbf = BashOperator(
            task_id = "download_pbf",
            bash_command = 'curl --fail -v -z "$sourceFilePath" -o "$sourceFilePath" "$url"',
            env = {
                "sourceFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
                "url": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
            },
            dag = self,
            doc_md="""
                # Download the PBF source file

                Download the source PBF file from the URL calculated by get_source_url.

                Links:
                * [curl documentation](https://curl.se/docs/manpage.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/bash.html)
            """
        )
        task_get_source_url >> task_download_pbf

        pbf_filter_group = TaskGroup("filter_osm_data", tooltip="Filter OpenStreetMap pbf data", dag=self)

        task_keep_name = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_name",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_name_file_path') }}",
            tags=['name'],
            dag = self,
            task_group=pbf_filter_group,
        )
        task_download_pbf >> task_keep_name

        task_keep_possible_ety = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_possible_etymology",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_name_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_possible_file_path') }}",
            tags=[
                'w/highway',
                'wikidata',
                'name:etymology:wikidata',
                'name:etymology',
                'subject:wikidata'
            ],
            remove_tags= True,
            dag = self,
            task_group=pbf_filter_group,
        )
        task_keep_name >> task_keep_possible_ety

        task_remove_non_interesting = OsmiumTagsFilterOperator(
            task_id = "remove_non_interesting_elements",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_possible_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_file_path') }}",
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
            dag = self,
            task_group=pbf_filter_group,
        )
        task_keep_possible_ety >> task_remove_non_interesting

        db_prepare_group = TaskGroup("prepare_db", tooltip="Prepare the DB", dag=self)
        
        task_setup_db_ext = PostgresOperator(
            task_id = "setup_db_extensions",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/setup-db-extensions.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Setup the necessary extensions on the local DB

                Setup PostGIS and HSTORE on the local Postgres DB if they are not already set up.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )

        task_teardown_schema = PostgresOperator(
            task_id = "teardown_schema",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/teardown-schema.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Teardown the oem DB schema

                Reset the oem (Open Etymology Map) schema on the local PostGIS DB to start from scratch.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_setup_db_ext >> task_teardown_schema

        task_setup_schema = PostgresOperator(
            task_id = "setup_schema",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/setup-schema.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Setup the oem DB schema

                Setup the oem (Open Etymology Map) schema on the local PostGIS DB.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_teardown_schema >> task_setup_schema

        db_load_group = TaskGroup("load_osm_data", tooltip="Load OpenStreetMap data on the DB", dag=self)
        
        task_osmium_or_osm2pgsql = BranchPythonOperator(
            task_id = "choose_load_osm_data_method",
            python_callable= choose_load_osm_data_task,
            dag = self,
            task_group=db_load_group,
            doc_md="""
                # Check how to load data into the DB

                Check whether to load the OSM data from the filtered PBF file through `osmium export` or through `osm2pgsql`.
                Unless the 'use_osm2pgsql' parameter is present and True, `osmium export` is choosen.
                This choice is due to the facts that
                * loading with `osmium export` is split in two parts (conversion with `osmium export` from PBF to PG tab-separated-values which takes most of the time and loading with Postgres `COPY` which is fast), so if something goes wrong during loading or downstream it's faster to fix the problem and load again from the PG file
                * loading with `osmium export`+`COPY` is faster than loading `osm2pgsql`

                The 'use_osm2pgsql' parameter is passed through the params object to allow customization when triggering the DAG.

                Links:
                * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
                * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html)
            """
        )
        task_remove_non_interesting >> task_osmium_or_osm2pgsql

        task_copy_config = PythonOperator(
            task_id = "copy_osmium_export_config",
            python_callable = do_copy_file,
            op_kwargs = {
                "source_path": get_absolute_path("osmium.json"),
                "dest_path": "/workdir/osmium.json",     
            },
            dag = self,
            task_group=db_load_group,
            doc_md="""
                # Copy the Osmium configuration

                Copy the configuration for `osmium export` ([osmium.json](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/init/osmium.json)) into the working directory.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/python.html)
            """
        )
        task_osmium_or_osm2pgsql >> Label("Use osmium export") >> task_copy_config

        task_export_to_pg = OsmiumExportOperator(
            task_id = "osmium_export_pbf_to_pg",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='pg_file_path') }}",
            cache_path= "/tmp/osmium_{{ ti.xcom_pull(task_ids='get_source_url', key='basename') }}_{{ ti.job_id }}",
            config_path= "/workdir/osmium.json",
            dag = self,
            task_group=db_load_group,
            doc_md="""
                # Export OSM data from PBF to PG

                Using `osmium export`, export the filtered OpenStreetMap data from the filtered PBF file to a PG tab-separated-values file ready for importing into the DB.
            """
        )
        task_copy_config >> task_export_to_pg

        task_load_ele_pg = PostgresCopyOperator(
            task_id = "load_elements_from_pg_file",
            postgres_conn_id = local_db_conn_id,
            filepath = "{{ ti.xcom_pull(task_ids='get_source_url', key='pg_file_path') }}",
            separator = '\t',
            schema = 'oem',
            table = 'osmdata',
            columns = ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"],
            dag = self,
            task_group=db_load_group,
            doc_md="""
                # Load OSM data from the PG file

                Load the filtered OpenStreetMap data from the PG tab-separated-values file to the `osmdata` table.
            """
        )
        [task_export_to_pg, task_setup_schema] >> task_load_ele_pg

        task_load_ele_osm2pgsql = Osm2pgsqlOperator(
            task_id = "load_elements_with_osm2pgsql",
            postgres_conn_id = local_db_conn_id,
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_file_path') }}",
            dag = self,
            task_group=db_load_group,
            doc_md="""
                # Load OSM data from the PBF file

                Using `osm2pgsql`, load the filtered OpenStreetMap data directly from the PBF file.
            """
        )
        task_osmium_or_osm2pgsql >> Label("Use osm2pgsql") >> task_load_ele_osm2pgsql
        task_setup_schema >> task_load_ele_osm2pgsql

        task_convert_osm2pgsql = PostgresOperator(
            task_id = "convert_osm2pgsql_data",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/convert-osm2pgsql-data.sql",
            dag = self,
            task_group=db_load_group,
            doc_md = """
                # Prepare osm2pgsql data for usage

                Convert OSM data loaded on the local PostGIS DB from `osm2pgsql`'s `planet_osm_*` tables to the standard `osmdata` table.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_load_ele_osm2pgsql >> task_convert_osm2pgsql

        join_load_ele = EmptyOperator(
            task_id = "join",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=db_load_group,
            doc_md="""
                # Join branches back together

                Dummy task for joining the path after the branching done to choose between `osmium export` and `osm2pgsql`.
            """
        )
        [task_load_ele_pg, task_convert_osm2pgsql] >> join_load_ele

        elaborate_group = TaskGroup("elaborate_data", tooltip="Elaborate data inside the DB", dag=self)

        task_remove_ele_too_big = PostgresOperator(
            task_id = "remove_elements_too_big",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/remove-elements-too-big.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove elements too big from the DB

                Remove elements that wouldn't be visible anyway on the map from the local PostGIS DB.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        join_load_ele >> task_remove_ele_too_big

        task_convert_ele_wd_cods = PostgresOperator(
            task_id = "convert_element_wikidata_cods",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/convert-element-wikidata-cods.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Convert OSM - Wikidata associations

                Fill the element_wikidata_cods table with OSM element <-> Wikidata Q-ID ("code") associations obtained from OSM elements, specifying for each oassociation the source (`wikidata` / `subject:wikidata` / `name:etymology:wikidata`).
                
                Links:
                * [`wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata)
                * [`subject:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:subject)
                * [`name:etymology:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata)
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
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
            dag = self,
            doc_md="""
                # Load default Wikidata entities

                Load into the wikidata table of the local PostGIS DB the default Wikidata entities (which either represent a gender or a type) from [wikidata_init.csv](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/init/wikidata_init.csv).
            """
        )
        task_setup_schema >> task_load_wd_ent

        task_convert_wd_ent = PostgresOperator(
            task_id = "convert_wikidata_entities",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/convert-wikidata-entities.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Load Wikidata entities from OSM etymologies

                Load into the wikidata table of the local PostGIS DB all the Wikidata entities that are etymologies from OSM (values from `subject:wikidata` or `name:etymology:wikidata`).
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        [task_convert_ele_wd_cods, task_load_wd_ent] >> task_convert_wd_ent

        task_load_named_after = SimpleHttpOperator(
            task_id = "download_named_after_wikidata_entities",
            http_conn_id = local_web_conn_id,
            endpoint = "/loadWikidataNamedAfterEntities.php",
            method = "GET",
            response_check = lambda response: response.status_code == 200,
            dag = self,
            task_group=elaborate_group,
            doc_md="""
                # Load Wikidata 'named after' entities

                For each existing Wikidata entity representing an OSM element, load into the wikidata table of the local PostGIS DB all the Wikidata entities that the entity is named after.

                Links:
                * [SimpleHttpOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-http/stable/_api/airflow/providers/http/operators/http/index.html#airflow.providers.http.operators.http.SimpleHttpOperator)
                * [SimpleHttpOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-http/stable/operators.html#simplehttpoperator)
            """
        )
        task_convert_wd_ent >> task_load_named_after
        
        task_load_consists_of = SimpleHttpOperator(
            task_id = "download_consists_of_wikidata_entities",
            http_conn_id = local_web_conn_id,
            endpoint = "/loadWikidataConsistsOfEntities.php",
            method = "GET",
            response_check = lambda response: response.status_code == 200,
            dag = self,
            task_group=elaborate_group,
            doc_md="""
                # Load Wikidata 'consists of' entities

                For each existing Wikidata entity representing the etymology for and OSM element, load into the wikidata table of the local PostGIS DB all the Wikidata entities that are part of the entity.

                Links:
                * [SimpleHttpOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-http/stable/_api/airflow/providers/http/operators/http/index.html#airflow.providers.http.operators.http.SimpleHttpOperator)
                * [SimpleHttpOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-http/stable/operators.html#simplehttpoperator)
            """
        )
        task_convert_wd_ent >> task_load_consists_of

        task_convert_ety = PostgresOperator(
            task_id = "convert_etymologies",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/convert-etymologies.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # TODO document
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        [task_load_named_after, task_load_consists_of] >> task_convert_ety

        task_propagate = PostgresOperator(
            task_id = "propagate_etymologies_globally",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/propagate-etymologies-global.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # TODO document
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_convert_ety >> task_propagate

        task_check_text_ety = PostgresOperator(
            task_id = "check_text_etymology",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/check-text-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # TODO document
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_propagate >> task_check_text_ety

        task_check_wd_ety = PostgresOperator(
            task_id = "check_wikidata_etymology",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/check-wd-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # TODO document
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_check_text_ety >> task_check_wd_ety

        task_move_ele = PostgresOperator(
            task_id = "move_elements_with_etymology",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/move-elements-with-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # TODO document
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_check_wd_ety >> task_move_ele

        task_setup_ety_fk = PostgresOperator(
            task_id = "setup_etymology_foreign_key",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/etymology-foreign-key.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # TODO document
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_move_ele >> task_setup_ety_fk

        task_drop_temp_tables = PostgresOperator(
            task_id = "drop_temporary_tables",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/drop-temp-tables.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove temporary tables

                Remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate etymologies.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_move_ele >> task_drop_temp_tables

        task_global_map = PostgresOperator(
            task_id = "setup_global_map",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/global-map.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md="""
                # Save the global map view

                Create in the local PostGIS DB the materialized view used for the clustered view at very low zoom level.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
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
            parameters = {
                "last_update": "{{ ti.xcom_pull(task_ids='get_source_url', key='last_data_update') }}"
            },
            dag = self,
            doc_md="""
                # Save into the DB the date of the last update

                Create in the local PostGIS DB the function that allows to retrieve the date of the last update of the data.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        [task_get_source_url, task_setup_schema] >> task_last_update

        task_pg_dump = PgDumpOperator(
            task_id = "pg_dump",
            postgres_conn_id=local_db_conn_id,
            dest_path="{{ ti.xcom_pull(task_ids='get_source_url', key='backup_file_path') }}",
            dag = self,
            doc_md="""
                # Backup the data from the local DB

                Backup the data from the local DB with pg_dump into the backup file.
            """
        )
        [task_setup_ety_fk, task_drop_temp_tables, task_global_map, task_last_update] >> task_pg_dump

        task_check_pg_restore = ShortCircuitOperator(
            task_id = "check_upload_conn_id",
            python_callable=check_upload_db_conn_id,
            dag = self,
            doc_md="""
                # Check upload DB connecton ID

                Check whether the connecton ID to the destination PostGIS DB is available: if it is, proceed to restore the data, otherwise stop here.

                The connection ID is passed through the params object to allow customization when triggering the DAG.

                Links:
                * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
                * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/stable/howto/operator/python.html#shortcircuitoperator)
                * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html)
            """
        )
        task_pg_dump >> task_check_pg_restore

        task_pg_restore = PgRestoreOperator(
            task_id = "pg_restore",
            src_path="{{ ti.xcom_pull(task_ids='get_source_url', key='backup_file_path') }}",
            dag = self,
            doc_md="""
                # Upload the data on the remote DB

                Upload the data from the backup file on the remote DB with pg_restore.
            """
        )
        task_check_pg_restore >> task_pg_restore



planet_pbf = OemDbInitDAG(
    dag_id="db-init-planet-latest",
    schedule_interval="@weekly",
    upload_db_conn_id="oem-prod",
    pbf_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-latest.osm.pbf"
)
planet_html = OemDbInitDAG(
    dag_id="db-init-planet-from-html",
    schedule_interval="@weekly",
    upload_db_conn_id="oem-prod",
    html_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/",
    html_prefix="planet"
)
planet_rss = OemDbInitDAG(
    dag_id="db-init-planet-from-rss",
    schedule_interval="@weekly",
    upload_db_conn_id="oem-prod",
    rss_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-pbf-rss.xml"
)

italy_pbf = OemDbInitDAG(
    dag_id="db-init-italy-latest",
    schedule_interval="@daily",
    upload_db_conn_id="oem-prod-no",
    pbf_url="http://download.geofabrik.de/europe/italy-latest.osm.pbf"
)
italy_html = OemDbInitDAG(
    dag_id="db-init-italy-from-html",
    schedule_interval="@daily",
    upload_db_conn_id="oem-prod-no",
    html_url="http://download.geofabrik.de/europe/",
    html_prefix="italy"
)

nord_ovest_pbf = OemDbInitDAG(
    dag_id="db-init-italy-nord-ovest-latest",
    schedule_interval="@daily",
    pbf_url="http://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf"
)
nord_ovest_html = OemDbInitDAG(
    dag_id="db-init-italy-nord-ovest-from-html",
    schedule_interval="@daily",
    html_url="http://download.geofabrik.de/europe/italy/",
    html_prefix="nord-ovest"
)

kosovo_html = OemDbInitDAG(
    dag_id="db-init-kosovo-from-html",
    schedule_interval="@daily",
    html_url="http://download.geofabrik.de/europe/",
    html_prefix="kosovo"
)
