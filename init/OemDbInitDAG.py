from os.path import dirname, abspath, join, basename, exists
from textwrap import dedent
from datetime import timedelta
from pendulum import datetime, now
from airflow.models import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.models.taskinstance import TaskInstance
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule
from airflow.utils.task_group import TaskGroup
from airflow.utils.edgemodifier import Label
from airflow.sensors.time_delta import TimeDeltaSensorAsync
from OsmiumTagsFilterOperator import OsmiumTagsFilterOperator
from OsmiumExportOperator import OsmiumExportOperator
from Osm2pgsqlOperator import Osm2pgsqlOperator
from OemDockerOperator import OemDockerOperator

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)

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

class TemplatedPostgresOperator(PostgresOperator):
    """
    ## `PostgresOperator` with templatable `parameters` and `postgres_conn_id`

    Standard `PostgresOperator` doesn't allow to use Jinja templates in `parameters` and `postgres_conn_id`, this Operator allows it.

    Links:
    * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
    * [templating docuementation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/custom-operator.html#templating)
    * [original value for `template_fields`](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_modules/airflow/providers/postgres/operators/postgres.html#PostgresOperator.template_fields)
    """
    template_fields = ('parameters', 'postgres_conn_id', 'sql')

def get_last_pbf_url(ti:TaskInstance, **context) -> str:
    """
        # Get PBF file URL

        Gets the URL of the OSM PBF file to download and derivate the path of the files that will be created later.
        The file urls, names and paths are calculated from the parameters 'pbf_url'/'rss_url'/'html_url'/'html_prefix'.

        The URL parameters are passed through the params object to allow customization when triggering the DAG.

        The task also calculates the paths of all files that will be generated.

        Links:
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/concepts/params.html)
        * [Apache Airflow best practices](https://airflow.apache.org/docs/apache-airflow/2.4.0/best-practices.html)
        * [TaskInstance documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/models/taskinstance/index.html)
    """
    from urllib.request import urlopen
    from re import search, findall
    from os import makedirs

    params = context["params"]
    
    work_dir = f'/workdir/{ti.dag_id}/{ti.run_id}'
    makedirs(work_dir)

    source_url = None
    if "pbf_url" in params and params["pbf_url"] and isinstance(params["pbf_url"],str):
        pbf_url = params["pbf_url"]
        print("Using 'pbf_url' as source URL: ", pbf_url)
        source_url = pbf_url
    elif "rss_url" in params and params["rss_url"] and isinstance(params["rss_url"],str) and params["rss_url"].endswith(".xml"):
        rss_url = params["rss_url"]
        print("Fetching the source URL from 'rss_url':", rss_url)
        from xml.etree.ElementTree import fromstring, ElementTree
        with urlopen(rss_url) as response:
            xml_content = response.read()
            rss_path = f"{work_dir}/{basename(rss_url)}"
            try:
                with open(rss_path, "w") as rss_file:
                    rss_file.write(xml_content)
            except:
                print("Failed saving RSS file content in working directory, proceding anyway")
            
            tree = ElementTree(fromstring(xml_content))
            root = tree.getroot()
            channel = root.find('channel')
            item = channel.find('item')
            link = item.find('link')
            source_url = link.text
    elif "html_url" in params and params["html_url"] and isinstance(params["html_url"],str) and \
            "html_prefix" in params and params["html_prefix"] and isinstance(params["html_prefix"],str):
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
    source_basename = basename(source_url)

    date_match = search('-(\d{2})(\d{2})(\d{2})\.', source_basename)
    if date_match != None:
        last_data_update = f'20{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'
    else:
        last_data_update = now('local').strftime('%y-%m-%d') # https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior
    
    ti.xcom_push(key='work_dir', value=work_dir)
    ti.xcom_push(key='source_url', value=source_url)
    ti.xcom_push(key='md5_url', value=f'{source_url}.md5')
    ti.xcom_push(key='basename', value=source_basename)
    ti.xcom_push(key='source_file_path', value=f"{work_dir}/{source_basename}")
    ti.xcom_push(key='md5_file_path', value=f"{work_dir}/{source_basename}.md5")
    ti.xcom_push(key='filtered_name_file_path', value=f"{work_dir}/filtered_name_{source_basename}")
    ti.xcom_push(key='filtered_possible_file_path', value=f"{work_dir}/filtered_possible_{source_basename}")
    ti.xcom_push(key='filtered_file_path', value=f"{work_dir}/filtered_{source_basename}")
    ti.xcom_push(key='osmium_config_file_path', value=f"{work_dir}/osmium.json")
    ti.xcom_push(key='pg_file_path', value=f"{work_dir}/{source_basename}.pg")
    ti.xcom_push(key='backup_file_path', value=f"{work_dir}/{source_basename}.backup")
    ti.xcom_push(key='last_data_update', value=last_data_update)

def do_copy_file(source_path:str, dest_path:str) -> None:
    """
    Copy a file from one path to another
    """
    from shutil import copyfile
    copyfile(source_path, dest_path)

def check_upload_db_conn_id(**context) -> bool:
    """
        # Check upload DB connecton ID

        Check whether the connecton ID to the destination PostGIS DB is available: if it is, proceed to restore the data, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/concepts/params.html)
    """
    p = context["params"]
    conn_id_available = "upload_db_conn_id" in p and isinstance(p["upload_db_conn_id"], str) and p["upload_db_conn_id"]!=""

    if conn_id_available:
        pg_hook = PostgresHook(p["upload_db_conn_id"])
        with pg_hook.get_conn() as pg_conn:
            with pg_conn.cursor() as cursor:
                cursor.execute("SELECT PostGIS_Version()")
                postgis_version = cursor.fetchone()
                print(f"upload_db_conn_id available, PostGIS version {postgis_version}")
    else:
        print("upload_db_conn_id not available")

    return conn_id_available

def choose_first_task(ti:TaskInstance, **context) -> str:
    """
        # Check whether to skip downloading OSM data

        Check whether to download and filter the OSM data or to skip directly to loading it because it has already been downloaded and filtered.
        Downloading and filtering the OSM data is skipped only if the `ffwd_to_load` parameter is present and True and the data has already been filtered in this or another DAG run.

        Unless the `use_osm2pgsql` parameter is present and True, `osmium export` is choosen by default (for the reasons explained in the 'choose_load_osm_data_method' task docs).
        The `ffwd_to_load` and `use_osm2pgsql` parameters are passed through the params object to allow customization when triggering the DAG.

        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/concepts/params.html)
    """
    p = context["params"]
    ffwd_to_load = "ffwd_to_load" in p and p["ffwd_to_load"]
    if ffwd_to_load:
        use_osm2pgsql = "use_osm2pgsql" in p and p["use_osm2pgsql"]
        xcom_file_key = 'filtered_file_path' if use_osm2pgsql else 'pg_file_path'
        loading_task_id = 'join_pre_osm2pgsql' if use_osm2pgsql else 'join_pre_load_from_pg'
        file_path = ti.xcom_pull(task_ids='get_source_url', key=xcom_file_key)
        file_exists = exists(file_path)
        if file_exists:
            print("Filtered OSM data already found in this folder, using it:", file_path)
            ret = loading_task_id
        else: # File does not exist in this folder, search in other workdir folders
            from glob import glob
            file_basename = basename(file_path)
            file_list = glob(f'/workdir/*/*/{file_basename}')
            if len(file_list) > 0:
                file_path = file_list[0]
                print("Filtered OSM data already found in another workdir folder:", file_path)
                ret = loading_task_id
            else:
                print("Filtered OSM data not found, downloading and filtering it")
                ret = "get_osm_data.download_pbf"
    else:
        print(f"ffwd_to_load=False, downloading and filtering OSM data")
        ret = "get_osm_data.download_pbf"
    
    ti.xcom_push(key=xcom_file_key, value=file_path)
    return ret

def choose_load_osm_data_task(**context) -> str:
    """
        # Check how to load data into the DB

        Check whether to load the OSM data from the filtered PBF file through `osmium export` or through `osm2pgsql`.
        Unless the `use_osm2pgsql` parameter is present and True, `osmium export` is choosen by default.
        This choice is due to the facts that
        * loading with `osmium export` is split in two parts (conversion with `osmium export` from PBF to PG tab-separated-values which takes most of the time and loading with Postgres `COPY` which is fast), so if something goes wrong during loading or downstream it's faster to fix the problem and load again from the PG file
        * loading with `osmium export`+`COPY` is faster than loading `osm2pgsql`

        The `use_osm2pgsql` parameter is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/concepts/params.html)
    """
    p = context["params"]
    use_osm2pgsql = "use_osm2pgsql" in p and p["use_osm2pgsql"]
    return "load_elements_with_osm2pgsql" if use_osm2pgsql else "copy_osmium_export_config"

class OemDbInitDAG(DAG):
    def __init__(self, local_db_conn_id:str="local-oem-postgres", upload_db_conn_id:str=None, pbf_url:str=None, rss_url:str=None, html_url:str=None, html_prefix:str=None, use_osm2pgsql:bool=False, ffwd_to_load:bool=True, days_before_cleanup:int=30, **kwargs):
        """
        DAG for Open Etymology Map DB initialization

        Parameters:
        ----------
        upload_db_conn_id: str
            Postgres connection ID for the production Database the DAG will upload to
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
        ffwd_to_load: bool
            if True, if the OSM data has already been downloaded and filtere it will not be downloaded again
        days_before_cleanup: int
            number of days to wait before cleaning up the DAG run temporary folder

        See https://airflow.apache.org/docs/apache-airflow/2.4.0/index.html
        """

        super().__init__(
                # https://airflow.apache.org/docs/apache-airflow/2.4.0/timezone.html
                # https://pendulum.eustace.io/docs/#instantiation
                start_date=datetime(year=2022, month=9, day=15, tz='local'),
                catchup=False,
                tags=['oem', 'db-init'],
                params={
                    "pbf_url": pbf_url,
                    "rss_url": rss_url,
                    "html_url": html_url,
                    "html_prefix": html_prefix,
                    "upload_db_conn_id": upload_db_conn_id,
                    "use_osm2pgsql": use_osm2pgsql,
                    "ffwd_to_load": ffwd_to_load,
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

        task_get_source_url = PythonOperator(
            task_id = "get_source_url",
            python_callable = get_last_pbf_url,
            do_xcom_push = True,
            dag = self,
            doc_md = get_last_pbf_url.__doc__
        )

        task_ffwd_to_upload = BranchPythonOperator(
            task_id = "choose_whether_to_ffwd",
            python_callable= choose_first_task,
            do_xcom_push = True,
            dag = self,
            doc_md = choose_first_task.__doc__
        )
        task_get_source_url >> task_ffwd_to_upload

        get_pbf_group = TaskGroup("get_osm_data", tooltip="Get OpenStreetMap .pbf data", dag=self)

        task_download_pbf = BashOperator(
            task_id = "download_pbf",
            bash_command = """
                curl --fail --verbose --location --max-redirs 5 --progress-bar -o "$sourceFilePath" "$sourceUrl"
                curl --fail --verbose --location --max-redirs 5 -o "$md5FilePath" "$md5Url"
                if [[ $(cat "$md5FilePath" | cut -f 1 -d ' ') != $(md5sum "$sourceFilePath" | cut -f 1 -d ' ') ]] ; then
                    echo "The md5 sum doesn't match:"
                    cat "$md5FilePath"
                    md5sum "$sourceFilePath"
                    exit 1
                fi
            """,
            env = {
                "sourceFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
                "sourceUrl": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
                "md5FilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='md5_file_path') }}",
                "md5Url": "{{ ti.xcom_pull(task_ids='get_source_url', key='md5_url') }}",
            },
            retries = 3,
            dag = self,
            task_group=get_pbf_group,
            doc_md="""
                # Download the PBF source file

                Download the source PBF file from the URL calculated by get_source_url and check that the md5 checksum checks out.

                Links:
                * [curl documentation](https://curl.se/docs/manpage.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/bash.html)
            """
        )
        task_ffwd_to_upload >> Label("Download and filter") >> task_download_pbf

        task_keep_name = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_name",
            container_name = "open-etymology-map-keep_elements_with_name",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_name_file_path') }}",
            tags=['name'],
            remove_tags= True,
            dag = self,
            task_group=get_pbf_group,
            doc_md = dedent("""
                # Keep only elements with a name

                Filter the OpenStreetMap PBF data to keep only elements which have a name.

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
        )
        task_download_pbf >> task_keep_name

        task_keep_possible_ety = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_possible_etymology",
            container_name = "open-etymology-map-keep_elements_with_possible_etymology",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_name_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_possible_file_path') }}",
            tags=[
                'w/highway=residential',
                'w/highway=unclassified',
                'w/highway=tertiary',
                'w/highway=secondary',
                'w/highway=primary',
                'w/highway=living_street',
                'wikidata',
                'name:etymology:wikidata',
                'name:etymology',
                'subject:wikidata'
            ],
            remove_tags= True,
            dag = self,
            task_group=get_pbf_group,
            doc_md = dedent("""
                # Keep only elements that could have an etymology

                Filter the OpenStreetMap PBF data to keep only elements which could have an etymology:
                * elements with the etymology directly specified via the tags `name:etymology`, `name:etymology:wikidata` or 'subject:wikidata'
                * elements that could have the etymology specified in the Wikidata entity linked by the tag `wikidata`
                * elements for which the etymology could be propagated from homonymous elements (to keep a reasonable computation time only some highways are kept for this purpose) 

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
        )
        task_keep_name >> task_keep_possible_ety

        task_remove_non_interesting = OsmiumTagsFilterOperator(
            task_id = "remove_non_interesting_elements",
            container_name = "open-etymology-map-remove_non_interesting_elements",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_possible_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_file_path') }}",
            tags=[
                'man_made=flagpole', # Flag poles
                'n/place=region','n/place=state','n/place=country','n/place=continent', # Label nodes
                'r/admin_level=5','r/admin_level=4','r/admin_level=3', # Region/province borders
                'r/admin_level=2', # Country borders
                'wikidata=Q314003' # Wrong value for wikidata=* (stepping stone)
            ],
            invert_match= True,
            dag = self,
            task_group=get_pbf_group,
            doc_md = dedent("""
                # Remove non iteresting elements

                Filter the OpenStreetMap PBF data to remove elements which are not interesting:
                * flagpoles (https://gitlab.com/openetymologymap/open-etymology-map/-/issues/5)
                * nodes that represent the label for a continent (`place=continent`), a country (`place=country`), a state (`place=state`) or a region (`place=region`), which out of their context would not make sense on the map
                * element representing an area too big for visualization (`admin_level=2`, `admin_level=3` or `admin_level=4`)

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_teardown_schema >> task_setup_schema

        group_db_load = TaskGroup("load_data_on_db", prefix_group_id=False, tooltip="Load the data on the DB", dag=self)
        group_osm2pgsql = TaskGroup("osm2pgsql", prefix_group_id=False, tooltip="Load OpenStreetMap data on the DB with osm2pgsql", dag=self, parent_group=group_db_load)
        group_osmium_export = TaskGroup("osmium_export", prefix_group_id=False, tooltip="Load OpenStreetMap data on the DB with osm2pgsql", dag=self, parent_group=group_db_load)

        task_osmium_or_osm2pgsql = BranchPythonOperator(
            task_id = "choose_load_osm_data_method",
            python_callable= choose_load_osm_data_task,
            dag = self,
            task_group=group_db_load,
            doc_md = choose_load_osm_data_task.__doc__
        )
        task_remove_non_interesting >> task_osmium_or_osm2pgsql

        join_pre_osm2pgsql = EmptyOperator(
            task_id = "join_pre_osm2pgsql",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=group_osm2pgsql,
            doc_md="""
                # Join branches back together

                Dummy task for joining the path after the branching done to choose whether to skip downloading and filtering data.
            """
        )
        task_ffwd_to_upload >> Label("Fast forward to osm2pgsql") >> join_pre_osm2pgsql
        task_osmium_or_osm2pgsql >> join_pre_osm2pgsql

        task_copy_config = PythonOperator(
            task_id = "copy_osmium_export_config",
            python_callable = do_copy_file,
            op_kwargs = {
                "source_path": get_absolute_path("osmium.json"),
                "dest_path": "{{ ti.xcom_pull(task_ids='get_source_url', key='osmium_config_file_path') }}",
            },
            dag = self,
            task_group=group_osmium_export,
            doc_md="""
                # Copy the Osmium configuration

                Copy the configuration for `osmium export` ([osmium.json](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/init/osmium.json)) into the working directory.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html)
            """
        )
        task_osmium_or_osm2pgsql >> Label("Use osmium export") >> task_copy_config

        task_export_to_pg = OsmiumExportOperator(
            task_id = "osmium_export_pbf_to_pg",
            container_name = "open-etymology-map-osmium_export_pbf_to_pg",
            source_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='filtered_file_path') }}",
            dest_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='pg_file_path') }}",
            cache_path= "/tmp/osmium_{{ ti.xcom_pull(task_ids='get_source_url', key='basename') }}_{{ ti.job_id }}",
            config_path= "{{ ti.xcom_pull(task_ids='get_source_url', key='osmium_config_file_path') }}",
            dag = self,
            task_group=group_osmium_export,
            doc_md=dedent("""
                # Export OSM data from PBF to PG

                Export the filtered OpenStreetMap data from the filtered PBF file to a PG tab-separated-values file ready for importing into the DB.

                Uses `osmium export` through `OsmiumExportOperator`:
            """) + dedent(OsmiumExportOperator.__doc__)
        )
        task_copy_config >> task_export_to_pg

        join_pre_load_from_pg = EmptyOperator(
            task_id = "join_pre_load_from_pg",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=group_osmium_export,
            doc_md="""
                # Join branches back together

                Dummy task for joining the path after the branching done to choose whether to skip downloading and filtering data.
            """
        )
        task_ffwd_to_upload >> Label("Fast forward to load from pg") >> join_pre_load_from_pg
        task_export_to_pg >> join_pre_load_from_pg

        task_load_ele_pg = PythonOperator(
            task_id = "load_elements_from_pg_file",
            python_callable = do_postgres_copy,
            op_kwargs = {
                "postgres_conn_id": local_db_conn_id,
                "filepath": "{{ ti.xcom_pull(task_ids='choose_whether_to_ffwd', key='pg_file_path') }}",
                "separator": '\t',
                "schema": 'oem',
                "table": 'osmdata',
                "columns": ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"],
            },
            dag = self,
            task_group=group_osmium_export,
            doc_md="""
                # Load OSM data from the PG file

                Load the filtered OpenStreetMap data from the PG tab-separated-values file to the `osmdata` table of the local PostGIS DB.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html)
            """
        )
        [join_pre_load_from_pg, task_setup_schema] >> task_load_ele_pg

        task_load_ele_osm2pgsql = Osm2pgsqlOperator(
            task_id = "load_elements_with_osm2pgsql",
            container_name = "open-etymology-map-load_elements_with_osm2pgsql",
            postgres_conn_id = local_db_conn_id,
            source_path= "{{ ti.xcom_pull(task_ids='choose_whether_to_ffwd', key='filtered_file_path') }}",
            dag = self,
            task_group=group_osm2pgsql,
            doc_md="""
                # Load OSM data from the PBF file

                Using `osm2pgsql`, load the filtered OpenStreetMap data directly from the PBF file.
            """
        )
        join_pre_osm2pgsql >> Label("Use osm2pgsql") >> task_load_ele_osm2pgsql
        task_setup_schema >> task_load_ele_osm2pgsql

        task_convert_osm2pgsql = PostgresOperator(
            task_id = "convert_osm2pgsql_data",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/convert-osm2pgsql-data.sql",
            dag = self,
            task_group=group_osm2pgsql,
            doc_md = """
                # Prepare osm2pgsql data for usage

                Convert OSM data loaded on the local PostGIS DB from `osm2pgsql`'s `planet_osm_*` tables to the standard `osmdata` table.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_load_ele_osm2pgsql >> task_convert_osm2pgsql

        join_post_load_ele = BashOperator(
            task_id = "join_post_load_ele",
            bash_command = 'ls -l "$workdir"',
            env = {
                "workdir": "{{ ti.xcom_pull(task_ids='get_source_url', key='work_dir') }}"
            },
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Join branches back together

                Dummy task for joining the path after the branching done to choose between `osmium export` and `osm2pgsql`.
            """
        )
        [task_load_ele_pg, task_convert_osm2pgsql] >> join_post_load_ele

        elaborate_group = TaskGroup("elaborate_data", tooltip="Elaborate data inside the DB", dag=self)

        task_remove_ele_too_big = PostgresOperator(
            task_id = "remove_elements_too_big",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/remove-elements-too-big.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove remaining non interesting elements

                Remove from the local PostGIS DB elements that aren't interesting and that it wasn't possible to remove during the filtering phase:
                * elements too big that wouldn't be visible anyway on the map 
                * elements that have a wrong etymology (name:etymology:wikidata and wikidata values are equal)
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        join_post_load_ele >> task_remove_ele_too_big

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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_remove_ele_too_big >> task_convert_ele_wd_cods

        wikidata_init_file_path = get_absolute_path('wikidata_init.csv')
        task_load_wd_ent = PythonOperator(
            task_id = "load_wikidata_entities",
            python_callable = do_postgres_copy,
            op_kwargs = {
                "postgres_conn_id": local_db_conn_id,
                "filepath": wikidata_init_file_path,
                "separator": ',',
                "schema": 'oem',
                "table": 'wikidata',
                "columns": ["wd_wikidata_cod","wd_notes","wd_gender_descr","wd_gender_color","wd_type_descr","wd_type_color"],
            },
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Load default Wikidata entities

                Load into the `wikidata` table of the local PostGIS DB the default Wikidata entities (which either represent a gender or a type) from [wikidata_init.csv](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/init/wikidata_init.csv).

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html)
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

                Load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are etymologies from OSM (values from `subject:wikidata` or `name:etymology:wikidata`).
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        [task_convert_ele_wd_cods, task_load_wd_ent] >> task_convert_wd_ent

        task_convert_ety = PostgresOperator(
            task_id = "convert_etymologies",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/convert-etymologies.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Convert the etymologies

                Fill the `etymology` table of the local PostGIS DB elaborated the etymologies from the `element_wikidata_cods` table.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_convert_wd_ent >> task_convert_ety

        task_load_named_after = OemDockerOperator(
            task_id = "download_named_after_wikidata_entities",
            container_name = "open-etymology-map-download_named_after_wikidata_entities",
            command = "php html/loadWikidataNamedAfterEntities.php",
            postgres_conn_id = local_db_conn_id,
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent("""
                # Load Wikidata 'named after' entities

                For each existing Wikidata entity representing an OSM element:
                * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
                * load into the `wikidata_named_after` table of the local PostGIS DB the 'named after' relationships
                
                Uses the Wikidata SPARQL query service through `OemDockerOperator`:
            """) + dedent(OemDockerOperator.__doc__)
        )
        task_convert_ety >> task_load_named_after

        task_propagate = PostgresOperator(
            task_id = "propagate_etymologies_globally",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/propagate-etymologies-global.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Propagate the etymologies

                Check the reliable etymologies (where multiple case-insensitive homonymous elements have etymologies to the exactly the same Wikidata entity).
                Then propagate reliable etymologies to case-insensitive homonymous elements that don't have any etymology.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_load_named_after >> task_propagate
        
        task_load_parts = OemDockerOperator(
            task_id = "download_parts_of_wikidata_entities",
            container_name = "open-etymology-map-download_parts_of_wikidata_entities",
            command = "php html/loadWikidataPartsOfEntities.php",
            postgres_conn_id = local_db_conn_id,
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent("""
                # Load Wikidata parts of entities

                For each existing Wikidata entity representing the etymology for and OSM element:
                * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are part of the entity
                * load into the `etymology` table of the local PostGIS DB the entity parts as etymology for the elements for which the container is an etymology
                
                Uses the Wikidata SPARQL query service through `OemDockerOperator`:
            """) + dedent(OemDockerOperator.__doc__)
        )
        task_propagate >> task_load_parts

        task_check_text_ety = PostgresOperator(
            task_id = "check_text_etymology",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/check-text-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Check elements with a text etymology

                Check elements with an etymology that comes from `name:etymology`.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_remove_ele_too_big >> task_check_text_ety

        task_check_wd_ety = PostgresOperator(
            task_id = "check_wikidata_etymology",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/check-wd-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Check elements with a Wikidata etymology

                Check elements with an etymology that comes from `subject:wikidata`, `name:etymology:wikidata` or `wikidata`+`...`.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_propagate >> task_check_wd_ety

        task_move_ele = PostgresOperator(
            task_id = "move_elements_with_etymology",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/move-elements-with-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove elements without any etymology

                Move only elements with an etymology from the `osmdata` temporary table of the local PostGIS DB to the `element` table.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        [task_load_parts, task_check_wd_ety, task_check_text_ety] >> task_move_ele

        task_setup_ety_fk = PostgresOperator(
            task_id = "setup_etymology_foreign_key",
            postgres_conn_id = local_db_conn_id,
            sql = "sql/etymology-foreign-key.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Apply the foreign key from etymology to wikidata
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        task_move_ele >> task_global_map

        task_last_update = TemplatedPostgresOperator(
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
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
        [task_get_source_url, task_setup_schema] >> task_last_update

        task_pg_dump = BashOperator(
            task_id = "pg_dump",
            bash_command='pg_dump --file="$backupFilePath" --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema="oem" --verbose --no-owner --no-privileges --no-tablespaces',
            env= {
                "backupFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='backup_file_path') }}",
                "host": f'{{{{ conn["{local_db_conn_id}"].host }}}}',
                "port": f'{{{{ (conn["{local_db_conn_id}"].port)|string }}}}',
                "user": f'{{{{ conn["{local_db_conn_id}"].login }}}}',
                "dbname": f'{{{{ conn["{local_db_conn_id}"].schema }}}}',
                "PGPASSWORD": f'{{{{ conn["{local_db_conn_id}"].password }}}}',
            },
            dag = self,
            doc_md="""
                # Backup the data from the local DB

                Backup the data from the local DB with pg_dump into the backup file.

                Links:
                * [pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/bash.html)
                * [Jinja template in f-string documentation](https://stackoverflow.com/questions/63788781/use-python-f-strings-and-jinja-at-the-same-time)
            """
        )
        [task_setup_ety_fk, task_drop_temp_tables, task_global_map, task_last_update] >> task_pg_dump

        group_upload = TaskGroup("upload_to_remote_db", tooltip="Upload elaborated data to the remote DB", dag=self)

        task_check_pg_restore = ShortCircuitOperator(
            task_id = "check_upload_conn_id",
            python_callable=check_upload_db_conn_id,
            dag = self,
            task_group = group_upload,
            doc_md=check_upload_db_conn_id.__doc__
        )
        task_pg_dump >> task_check_pg_restore

        task_prepare_upload = TemplatedPostgresOperator(
            task_id = "prepare_db_for_upload",
            postgres_conn_id = "{{ params.upload_db_conn_id }}",
            sql = "sql/prepare-db-for-upload.sql",
            dag = self,
            task_group = group_upload,
            doc_md="""
                # Prepare the remote DB for uploading

                Prepare the remote DB configured in upload_db_conn_id for uploading data by resetting the oem schema 

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html)
            """
        )
        task_check_pg_restore >> task_prepare_upload

        task_pg_restore = BashOperator(
            task_id = "pg_restore",
            bash_command='pg_restore --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --schema "oem" --verbose "$backupFilePath"',
            env= {
                "backupFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='backup_file_path') }}",
                "host": "{{ conn[params.upload_db_conn_id].host }}",
                "port": "{{ (conn[params.upload_db_conn_id].port)|string }}",
                "user": "{{ conn[params.upload_db_conn_id].login }}",
                "dbname": "{{ conn[params.upload_db_conn_id].schema }}",
                "PGPASSWORD": "{{ conn[params.upload_db_conn_id].password }}",
            },
            dag = self,
            task_group = group_upload,
            doc_md="""
                # Upload the data on the remote DB

                Upload the data from the backup file on the remote DB configured in upload_db_conn_id with pg_restore.

                Links:
                * [pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/bash.html)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.4.0/templates-ref.html)
            """
        )
        task_prepare_upload >> task_pg_restore

        group_cleanup = TaskGroup("cleanup", tooltip="Cleanup the DAG temporary files", dag=self)

        task_wait_cleanup = TimeDeltaSensorAsync(
            task_id = 'wait_for_cleanup_time',
            delta = timedelta(days=days_before_cleanup),
            trigger_rule = TriggerRule.NONE_SKIPPED,
            dag = self,
            task_group = group_cleanup,
            doc_md = """
                # Wait for the time to cleanup the temporary files

                Links:
                * [TimeDeltaSensorAsync](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/sensors/time_delta/index.html)
                * [DateTimeSensor documentation](https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/sensors/date_time/index.html)
                * [DateTimeSensor test](https://www.mikulskibartosz.name/delay-airflow-dag-until-given-hour-using-datetimesensor/)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html)
            """
        )
        task_pg_dump >> task_wait_cleanup
    
        task_cleanup = BashOperator(
            task_id = "cleanup",
            bash_command = 'rm -r "$workDir"',
            env = {
                "workDir": "{{ ti.xcom_pull(task_ids='get_source_url', key='work_dir') }}",
            },
            dag = self,
            task_group = group_cleanup,
            doc_md = """
                # Cleanup the work directory

                Remove the DAG run folder
            """
        )
        task_wait_cleanup >> task_cleanup