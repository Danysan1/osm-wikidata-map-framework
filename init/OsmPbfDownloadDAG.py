from os.path import basename, exists
from textwrap import dedent
from pendulum import datetime, now
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.models.taskinstance import TaskInstance
from airflow.utils.trigger_rule import TriggerRule
from get_last_pbf_url import get_last_pbf_url, get_pbf_date
from TorrentDownloadOperator import TorrentDownloadOperator

def get_source_url(ti:TaskInstance, **context) -> str:
    """
        # Get PBF file URL

        Gets the URL of the OSM PBF file to download and derivate the path of the files that will be created later.
        The file urls, names and paths are calculated from the parameters 'pbf_url'/'rss_url'/'html_url'/'prefix'.

        The URL parameters are passed through the params object to allow customization when triggering the DAG.

        The task also calculates the paths of all files that will be generated.

        Links:
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/concepts/params.html)
        * [Apache Airflow best practices](https://airflow.apache.org/docs/apache-airflow/2.4.0/best-practices.html)
        * [TaskInstance documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/models/taskinstance/index.html)
    """
    from os import makedirs

    params = context["params"]
    
    work_dir = f'/workdir/{ti.dag_id}/{ti.run_id}'
    if not exists(work_dir):
        makedirs(work_dir)
    
    dataset_dir = f'/workdir/{params["prefix"]}'
    if not exists(dataset_dir):
        makedirs(dataset_dir)

    source_url = get_last_pbf_url(
        download_url = params["pbf_url"] if "pbf_url" in params else None,
        rss_url = params["rss_url"] if "rss_url" in params else None,
        html_url = params["html_url"] if "html_url" in params else None,
        prefix = params["prefix"]
    )
    source_basename = basename(source_url) # https://linuxhint.com/fetch-basename-python/
    last_data_update = get_pbf_date(source_basename)
    
    ti.xcom_push(key='work_dir', value=work_dir)
    ti.xcom_push(key='source_url', value=source_url)
    ti.xcom_push(key='md5_url', value=f'{source_url}.md5')
    ti.xcom_push(key='basename', value=source_basename)
    ti.xcom_push(key='source_file_path', value=f"{work_dir}/{source_basename}")
    ti.xcom_push(key='md5_file_path', value=f"{work_dir}/{source_basename}.md5")
    ti.xcom_push(key='last_data_update', value=last_data_update)

def check_whether_to_procede(date_path, ti:TaskInstance, **context) -> bool:
    """
        # Check whether to procede

        Check whether the available file is newer than the existing dataset: if it is, proceed to download the data, otherwise stop here.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/concepts/params.html)
    """
    from pendulum import parse
    p = context["params"]
    if not exists(date_path):
        print("Proceding to download (missing date file)")
        procede = True
    else:
        with open(date_path) as date_file:
            date:str = date_file.read().strip()
        skip_if_already_downloaded:bool = "skip_if_already_downloaded" in p and p["skip_if_already_downloaded"]
        last_data_update = ti.xcom_pull(task_ids='get_source_url', key='last_data_update')
        print("Existing and new date:", last_data_update, date)
        procede = not skip_if_already_downloaded or parse(date) > parse(last_data_update)
    return procede

class OsmPbfDownloadDAG(DAG):
    def __init__(self,
            pbf_url:str=None,
            rss_url:str=None,
            html_url:str=None,
            prefix:str=None,
            skip_if_already_downloaded:bool=True,
            use_torrent:bool=False,
            **kwargs
        ):
        """
        DAG for Open Etymology Map DB initialization

        Parameters:
        ----------
        pbf_url: str
            URL to the PBF file
        rss_url: str
            URL to the RSS file listing PBF files
        html_url: str
            URL to the HTML file listing PBF files
        prefix: str
            prefix to search in the PBF filename 
        skip_if_already_downloaded: bool
            if True, if the OSM data has already been downloaded it will not be downloaded again

        See https://airflow.apache.org/docs/apache-airflow/2.4.0/index.html
        """
        date_path = f'/workdir/{prefix}/{prefix}.date.txt'
        pbf_path = f'/workdir/{prefix}/{prefix}.osm.pbf'
        date_dataset = Dataset(f'file://{date_path}')
        pbf_dataset = Dataset(f'file://{pbf_path}')

        default_params = {
            "pbf_url": pbf_url,
            "rss_url": rss_url,
            "html_url": html_url,
            "prefix": prefix,
            "skip_if_already_downloaded": skip_if_already_downloaded,
        }

        super().__init__(
                # https://airflow.apache.org/docs/apache-airflow/2.4.0/timezone.html
                # https://pendulum.eustace.io/docs/#instantiation
                start_date=datetime(year=2022, month=9, day=15, tz='local'),
                catchup=False,
                tags=['oem', 'pbf-download', 'produces'],
                params=default_params,
                doc_md="""
                    # Open Etymology Map DB initialization

                    * downloads OSM PBF data

                    Documentation in the task descriptions and in the [project's CONTRIBUTIG.md](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md).
                """,
                **kwargs
            )

        task_get_source_url = PythonOperator(
            task_id = "get_source_url",
            python_callable = get_source_url,
            op_kwargs = { "download_ext": 'osm.pbf.torrent' if use_torrent else 'osm.pbf' },
            do_xcom_push = True,
            dag = self,
            doc_md = get_source_url.__doc__
        )

        task_check_whether_to_procede = ShortCircuitOperator(
            task_id = "check_whether_to_procede",
            python_callable = check_whether_to_procede,
            op_kwargs = { "date_path": date_path },
            dag = self,
            doc_md=check_whether_to_procede.__doc__
        )
        task_get_source_url >> task_check_whether_to_procede

        task_chose_download_method = BranchPythonOperator(
            task_id = "chose_download_method",
            python_callable = lambda: 'download_torrent' if use_torrent else 'download_pbf',
            dag = self
        )
        task_check_whether_to_procede >> task_chose_download_method

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
            doc_md="""
                # Download the PBF source file

                Download the source PBF file from the URL calculated by get_source_url and check that the md5 checksum checks out.

                Links:
                * [curl documentation](https://curl.se/docs/manpage.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.4.0/howto/operator/bash.html)
            """
        )
        task_chose_download_method >> task_download_pbf

        task_download_torrent = TorrentDownloadOperator(
            task_id = "download_torrent",
            torrent_url = "{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
            dest_folder = "{{ ti.xcom_pull(task_ids='get_source_url', key='work_dir') }}",
            dag = self,
            doc_md=dedent("""
                # Download the PBF source file through torrent

                Download the source PBF file from the torrent URL calculated by get_source_url.

                Uses `transmission-cli` through `TorrentDownloadOperator`:
            """) + dedent(TorrentDownloadOperator.__doc__)
        )
        task_chose_download_method >> task_download_torrent

        task_join = BashOperator(
            task_id = "join_post_download",
            bash_command = 'ls -l "$workdir"',
            env = {
                "workdir": "{{ ti.xcom_pull(task_ids='get_source_url', key='work_dir') }}"
            },
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag=self
        )
        [task_download_pbf, task_download_torrent] >> task_join

        task_save_pbf = BashOperator(
            task_id = "save_pbf",
            bash_command = 'mv "$sourceFilePath" "$pbfPath"',
            env = {
                "sourceFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
                "pbfPath": pbf_path,
            },
            outlets = pbf_dataset,
            dag = self
        )
        task_join >> task_save_pbf

        task_save_date = BashOperator(
            task_id = "save_date",
            bash_command = 'echo "$date" > "$datePath"',
            env = {
                "date": "{{ ti.xcom_pull(task_ids='get_source_url', key='last_data_update') }}",
                "datePath": date_path,
            },
            outlets = date_dataset,
            dag = self
        )
        task_join >> task_save_date
