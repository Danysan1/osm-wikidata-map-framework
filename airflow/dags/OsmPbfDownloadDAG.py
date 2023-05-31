from textwrap import dedent
from pendulum import datetime, now
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.models.taskinstance import TaskInstance
from airflow.utils.trigger_rule import TriggerRule
from airflow.sensors.python import PythonSensor
from airflow.sensors.time_delta import TimeDeltaSensorAsync
from datetime import timedelta
from get_last_pbf_url import get_last_pbf_url, get_pbf_date
from TransmissionStartTorrentOperator import TransmissionStartTorrentOperator
from TransmissionWaitTorrentSensor import TransmissionWaitTorrentSensor
from TransmissionRemoveTorrentOperator import TransmissionRemoveTorrentOperator

def get_source_url(ti:TaskInstance, **context) -> str:
    """
        # Get PBF file URL

        Gets the URL of the OSM PBF file to download and derivate the path of the files that will be created later.
        The file urls, names and paths are calculated from the parameters 'pbf_url'/'rss_url'/'html_url'/'prefix'.

        The URL parameters are passed through the params object to allow customization when triggering the DAG.

        The task also calculates the paths of all files that will be generated.

        Links:
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
        * [Apache Airflow best practices](https://airflow.apache.org/docs/apache-airflow/2.6.0/best-practices.html)
        * [TaskInstance documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/models/taskinstance/index.html)
    """
    from os import path, makedirs
    import re

    params = context["params"]
    
    work_dir = f'/workdir/{ti.dag_id}/{ti.run_id}'
    if not path.exists(work_dir):
        makedirs(work_dir)
    
    dataset_dir = f'/workdir/{params["prefix"]}'
    if not path.exists(dataset_dir):
        makedirs(dataset_dir)

    source_url = get_last_pbf_url(
        download_url = params["pbf_url"] if "pbf_url" in params else None,
        rss_url = params["rss_url"] if "rss_url" in params else None,
        html_url = params["html_url"] if "html_url" in params else None,
        prefix = params["prefix"]
    )
    source_basename = path.basename(source_url) # https://linuxhint.com/fetch-basename-python/
    file_basename = re.sub('\.torrent$', '', source_basename)
    last_data_update = get_pbf_date(source_basename)
    
    ti.xcom_push(key='work_dir', value=work_dir)
    ti.xcom_push(key='source_url', value=source_url)
    ti.xcom_push(key='md5_url', value=f'{source_url}.md5')
    ti.xcom_push(key='source_basename', value=source_basename)
    ti.xcom_push(key='file_basename', value=file_basename)
    ti.xcom_push(key='source_file_path', value=f"{work_dir}/{source_basename}")
    ti.xcom_push(key='downloaded_file_path', value=f"{work_dir}/{file_basename}")
    ti.xcom_push(key='md5_file_path', value=f"{work_dir}/{source_basename}.md5")
    ti.xcom_push(key='last_data_update', value=last_data_update)

def check_whether_to_procede(date_path, ti:TaskInstance, **context) -> bool:
    """
        # Check whether to procede

        Check whether the available file is newer than the existing dataset: if it is, proceed to download the data, otherwise stop here.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    from pendulum import parse
    from os import path

    p = context["params"]
    if not path.exists(date_path):
        print(f"Proceeding to download (missing date file '{date_path}')")
        procede = True
    else:
        with open(date_path) as date_file:
            existing_date:str = date_file.read().strip()
        skip_if_already_downloaded:bool = "skip_if_already_downloaded" in p and p["skip_if_already_downloaded"]
        new_date = ti.xcom_pull(task_ids='get_source_url', key='last_data_update')
        print(f"Existing date: {existing_date} (from date file '{date_path}')")
        print(f"New date: {new_date}")
        procede = not skip_if_already_downloaded or parse(new_date) > parse(existing_date)
        print('Proceeding to download' if procede else 'NOT proceeding')
    return procede

class OsmPbfDownloadDAG(DAG):
    def __init__(self,
            pbf_url:str=None,
            rss_url:str=None,
            html_url:str=None,
            prefix:str=None,
            skip_if_already_downloaded:bool=True,
            days_before_cleanup:int=1,
            **kwargs
        ):
        """
        DAG for OSM-Wikidata Map Framework DB initialization

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

        See https://airflow.apache.org/docs/apache-airflow/2.6.0/index.html
        """
        pbf_path = f'/workdir/{prefix}/{prefix}.osm.pbf'
        pbf_date_path = f'/workdir/{prefix}/{prefix}.osm.pbf.date.txt'
        pbf_dataset = Dataset(f'file://{pbf_path}')

        default_params = {
            "pbf_url": pbf_url,
            "rss_url": rss_url,
            "html_url": html_url,
            "prefix": prefix,
            "skip_if_already_downloaded": skip_if_already_downloaded,
        }

        super().__init__(
                # https://airflow.apache.org/docs/apache-airflow/2.6.0/timezone.html
                # https://pendulum.eustace.io/docs/#instantiation
                start_date=datetime(year=2022, month=9, day=15, tz='local'),
                catchup=False,
                tags=['oem', f'oem-{prefix}', 'pbf-download', 'produces'],
                params=default_params,
                doc_md="""
                    # OSM-Wikidata Map Framework DB initialization

                    * downloads OSM PBF data

                    Documentation in the task descriptions and in the [project's CONTRIBUTIG.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md).
                """,
                **kwargs
            )

        task_get_source_url = PythonOperator(
            task_id = "get_source_url",
            python_callable = get_source_url,
            do_xcom_push = True,
            dag = self,
            doc_md = get_source_url.__doc__
        )

        task_check_whether_to_procede = ShortCircuitOperator(
            task_id = "check_whether_to_procede",
            python_callable = check_whether_to_procede,
            op_kwargs = { "date_path": pbf_date_path },
            dag = self,
            doc_md=check_whether_to_procede.__doc__
        )
        task_get_source_url >> task_check_whether_to_procede

        task_choose_download_method = BranchPythonOperator(
            task_id = "choose_download_method",
            python_callable = lambda ti: 'download_torrent' if ti.xcom_pull(task_ids='get_source_url', key='source_url').endswith(".torrent") else 'download_pbf',
            dag = self
        )
        task_check_whether_to_procede >> task_choose_download_method

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
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/bash.html)
            """
        )
        task_choose_download_method >> task_download_pbf

        task_download_torrent = TransmissionStartTorrentOperator(
            task_id = "download_torrent",
            torrent_url = "{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
            download_dir = "{{ ti.xcom_pull(task_ids='get_source_url', key='work_dir') }}",
            torrent_daemon_conn_id = "torrent_daemon",
            dag = self,
            doc_md="""
                ## Download the PBF source file through torrent

                Start the download of the source PBF file from the torrent URL calculated by get_source_url.
            """
        )
        task_choose_download_method >> task_download_torrent

        task_wait_for_torrent_download = TransmissionWaitTorrentSensor(
            task_id = "wait_torrent_download",
            retries = 3,
            torrent_hash = "{{ ti.xcom_pull(task_ids='download_torrent', key='torrent_hash') }}",
            torrent_daemon_conn_id = "torrent_daemon",
            dag = self,
            doc_md=dedent("""
                # Wait for the torrent download to complete 

                Check the torrent daemon until the torrent download has completed.
            """)
        )
        task_download_torrent >> task_wait_for_torrent_download

        task_join = BashOperator(
            task_id = "join_post_download",
            bash_command = 'ls -l "$workdir"',
            env = {
                "workdir": "{{ ti.xcom_pull(task_ids='get_source_url', key='work_dir') }}"
            },
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag=self
        )
        [task_download_pbf, task_wait_for_torrent_download] >> task_join

        task_save_pbf = BashOperator(
            task_id = "save_pbf",
            bash_command = 'cp "$downloadedFilePath" "$pbfPath" && echo "$date" > "$datePath"',
            env = {
                "downloadedFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='downloaded_file_path') }}",
                "pbfPath": pbf_path,
                "date": "{{ ti.xcom_pull(task_ids='get_source_url', key='last_data_update') }}",
                "datePath": pbf_date_path,
            },
            outlets = pbf_dataset,
            dag = self
        )
        task_join >> task_save_pbf

        task_wait_cleanup = TimeDeltaSensorAsync(
            task_id = 'wait_for_cleanup_time',
            delta = timedelta(days=days_before_cleanup),
            trigger_rule = TriggerRule.NONE_SKIPPED,
            dag = self,
            doc_md = """
                # Wait for the time to cleanup the temporary files

                Links:
                * [TimeDeltaSensorAsync](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/sensors/time_delta/index.html)
                * [DateTimeSensor documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/sensors/date_time/index.html)
                * [DateTimeSensor test](https://www.mikulskibartosz.name/delay-airflow-dag-until-given-hour-using-datetimesensor/)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.6.0/templates-ref.html)
            """
        )
        task_save_pbf >> task_wait_cleanup

        task_choose_cleanup_method = BranchPythonOperator(
            task_id = "choose_cleanup_method",
            python_callable = lambda ti: 'cleanup_torrent' if ti.xcom_pull(task_ids='get_source_url', key='source_url').endswith(".torrent") else 'cleanup_pbf',
            dag = self
        )
        task_wait_cleanup >> task_choose_cleanup_method
    
        task_cleanup_torrent = TransmissionRemoveTorrentOperator(
            task_id = "cleanup_torrent",
            torrent_hash = "{{ ti.xcom_pull(task_ids='download_torrent', key='torrent_hash') }}",
            torrent_daemon_conn_id = "torrent_daemon",
            dag = self,
            doc_md = """
                # Remove the torrent

                Remove the torrent from the DAG run folder and from the torrent daemon
            """
        )
        task_choose_cleanup_method >> task_cleanup_torrent
    
        task_cleanup_pbf = BashOperator(
            task_id = "cleanup_pbf",
            bash_command = 'rm -r "$workDir"',
            env = {
                "workDir": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}",
            },
            dag = self,
            doc_md = """
                # Cleanup the work directory

                Remove the DAG run folder
            """
        )
        task_choose_cleanup_method >> task_cleanup_pbf
