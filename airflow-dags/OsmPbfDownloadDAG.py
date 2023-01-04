from textwrap import dedent
from pendulum import datetime, now
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.models.taskinstance import TaskInstance
from airflow.utils.trigger_rule import TriggerRule
from airflow.sensors.python import PythonSensor
from get_last_pbf_url import get_last_pbf_url, get_pbf_date

def get_source_url(ti:TaskInstance, **context) -> str:
    """
        # Get PBF file URL

        Gets the URL of the OSM PBF file to download and derivate the path of the files that will be created later.
        The file urls, names and paths are calculated from the parameters 'pbf_url'/'rss_url'/'html_url'/'prefix'.

        The URL parameters are passed through the params object to allow customization when triggering the DAG.

        The task also calculates the paths of all files that will be generated.

        Links:
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
        * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/howto/operator/python.html)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/concepts/params.html)
        * [Apache Airflow best practices](https://airflow.apache.org/docs/apache-airflow/2.5.0/best-practices.html)
        * [TaskInstance documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/_api/airflow/models/taskinstance/index.html)
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
    ti.xcom_push(key='md5_file_path', value=f"{work_dir}/{source_basename}.md5")
    ti.xcom_push(key='last_data_update', value=last_data_update)

def check_whether_to_procede(date_path, ti:TaskInstance, **context) -> bool:
    """
        # Check whether to procede

        Check whether the available file is newer than the existing dataset: if it is, proceed to download the data, otherwise stop here.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/concepts/params.html)
    """
    from pendulum import parse
    from os import path

    p = context["params"]
    if not path.exists(date_path):
        print("Proceding to download (missing date file)")
        procede = True
    else:
        with open(date_path) as date_file:
            existing_date:str = date_file.read().strip()
        skip_if_already_downloaded:bool = "skip_if_already_downloaded" in p and p["skip_if_already_downloaded"]
        new_date = ti.xcom_pull(task_ids='get_source_url', key='last_data_update')
        print("Existing and new date:", existing_date, new_date)
        procede = not skip_if_already_downloaded or parse(new_date) > parse(existing_date)
    return procede

def start_torrent_download(ti:TaskInstance):
    """
    See https://transmission-rpc.readthedocs.io/en/v3.4.0/client.html
    """
    from transmission_rpc import Client
    download_dir = ti.xcom_pull(task_ids='get_source_url', key='work_dir')
    torrent_url = ti.xcom_pull(task_ids='get_source_url', key='source_url')
    c = Client(host="torrent-daemon")
    torrent = c.add_torrent(torrent_url, download_dir=download_dir)
    ti.xcom_push(key="torrent_id", value=torrent.id)

def check_if_torrent_is_complete(ti:TaskInstance) -> bool:
    """
    See https://transmission-rpc.readthedocs.io/en/v3.4.0/client.html
    See https://transmission-rpc.readthedocs.io/en/v3.4.0/torrent.html
    """
    from transmission_rpc import Client
    torrent_id = ti.xcom_pull(task_ids='download_torrent', key='torrent_id')
    c = Client(host="torrent-daemon")
    torrent = c.get_torrent(torrent_id)
    return torrent.status == "seeding"

class OsmPbfDownloadDAG(DAG):
    def __init__(self,
            pbf_url:str=None,
            rss_url:str=None,
            html_url:str=None,
            prefix:str=None,
            skip_if_already_downloaded:bool=True,
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

        See https://airflow.apache.org/docs/apache-airflow/2.5.0/index.html
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
                # https://airflow.apache.org/docs/apache-airflow/2.5.0/timezone.html
                # https://pendulum.eustace.io/docs/#instantiation
                start_date=datetime(year=2022, month=9, day=15, tz='local'),
                catchup=False,
                tags=['oem', f'oem-{prefix}', 'pbf-download', 'produces'],
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

        task_chose_download_method = BranchPythonOperator(
            task_id = "chose_download_method",
            python_callable = lambda ti: 'download_torrent' if ti.xcom_pull(task_ids='get_source_url', key='source_url').endswith(".torrent") else 'download_pbf',
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
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.0/howto/operator/bash.html)
            """
        )
        task_chose_download_method >> task_download_pbf

        task_download_torrent = PythonOperator(
            task_id = "download_torrent",
            python_callable = start_torrent_download,
            dag = self,
            doc_md=dedent("""
                # Download the PBF source file through torrent

                Start the download of the source PBF file from the torrent URL calculated by get_source_url.

                Explored torrent download options:

                1. Download using DockerOperator + lftp
                    * Docker image: `minidocks/lftp:latest`
                    * Command: `lftp -c torrent -O '{dest_folder}' '{torrent_url}'`
                    * Documentation: http://lftp.yar.ru/lftp-man.html
                    * Problems:
                        * it fails with 'Not saving nodes, DHT not ready'
                2. Download using DockerOperator + aria2c
                    * Docker image: `207m/aria2c:latest`
                    * Command: `aria2c --dir '{dest_folder}' '{torrent_url}'`
                    * Documentation: https://aria2.github.io/manual/en/html/aria2c.html#bittorrent-metalink-options
                    * Problems:
                        * it fails
                3. Download using DockerOperator + transmission-cli
                    * Docker image: `mikesplain/transmission-cli`
                    * Command: `transmission-cli --download-dir '{dest_folder}' '{torrent_url}'`
                    * Documentation: https://manpages.ubuntu.com/manpages/bionic/man1/transmission-cli.1.html
                    * Problems:
                        * transmission-cli is deprecated in favor of transmission-remote
                        * it fails with 'Not saving nodes, DHT not ready'
                        * even if it fails it returns a success return code
                4. Download using DockerOperator + transmission-remote (+ transmission-daemon)
                    * Docker image: `linuxserver/transmission`
                    * Command: `transmission-remote torrent-daemon:9091 --download-dir '{dest_folder}' --add '{torrent_url}'`
                    * Documentation: https://linux.die.net/man/1/transmission-remote
                    * Notes:
                        * requires transmission-daemon (see torrent-daemon service in docker-compose.yml)
                    * Problems:
                        * adds the torrent to the download queue but doesn't return the torrent id, making it really hard to check the status
                5. Download using PythonOperator + transmission-rpc (+ transmission-daemon)
                    * Current implementation
                    * Notes:
                        * requires transmission-daemon (see torrent-daemon service in docker-compose.yml)
            """)
        )
        task_chose_download_method >> task_download_torrent

        task_wait_for_torrent_download = PythonSensor(
            task_id = "wait_torrent_download",
            python_callable = check_if_torrent_is_complete,
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
            bash_command = 'mv "$sourceFilePath" "$pbfPath" && echo "$date" > "$datePath"',
            env = {
                "sourceFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
                "pbfPath": pbf_path,
                "date": "{{ ti.xcom_pull(task_ids='get_source_url', key='last_data_update') }}",
                "datePath": pbf_date_path,
            },
            outlets = pbf_dataset,
            dag = self
        )
        task_join >> task_save_pbf
