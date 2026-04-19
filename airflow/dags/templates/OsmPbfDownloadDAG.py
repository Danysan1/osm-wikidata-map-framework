from datetime import timedelta
from os import listdir
from os.path import exists, join

from airflow.models.taskinstance import TaskInstance
from airflow.providers.common.compat.sdk import TriggerRule
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.sdk import Asset, dag, get_current_context, task
from operators.TransmissionRemoveTorrentOperator import \
    TransmissionRemoveTorrentOperator
from operators.TransmissionStartTorrentOperator import \
    TransmissionStartTorrentOperator
from operators.TransmissionWaitTorrentSensor import \
    TransmissionWaitTorrentSensor
from pendulum import datetime, parse
from utils.get_last_pbf_url import get_last_pbf_url, get_pbf_date

SKIP_IF_ALREADY_DOWNLOADED = "skip_if_already_downloaded"
DEFAULT_SKIP_IF_ALREADY_DOWNLOADED = True

DEFAULT_DAYS_BEFORE_CLEANUP = 1


def OsmPbfDownloadDAG(
    prefix: str,
    pbf_url: str | None = None,
    rss_url: str | None = None,
    html_url: str | None = None,
    days_before_cleanup: int = DEFAULT_DAYS_BEFORE_CLEANUP,
    verify_md5: bool = True,
    **kwargs
):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework OSM PBF file download.

    Keyword arguments:
    ----------
    pbf_url: str
        URL to the PBF file
    rss_url: str
        URL to the RSS file listing the available PBF files
    html_url: str
        URL to the HTML file listing the available PBF files (including the desired one).
        On Geofabrik this can be found from the "raw directory index" link on the interface.
        Example: for an european country use https://download.geofabrik.de/europe/ , NOT https://download.geofabrik.de/europe.html
    prefix: str
        prefix to search in the PBF filename 
    verify_md5: bool
        Whether to check the md5 checksum of the osm.pbf file
    """
    dest_folder = f'/workdir/{prefix}'
    pbf_path = f'{dest_folder}/{prefix}.osm.pbf'
    pbf_date_path = f'{dest_folder}/{prefix}.osm.pbf.date.txt'
    pbf_asset = Asset(f'file://{pbf_path}')

    # Path to the temporary folder where the DAG will store the intermediate files
    workdir = join("/workdir", prefix, "{{ ti.dag_id }}", "{{ ti.run_id }}")

    default_params = {
        "pbf_url": pbf_url,
        "rss_url": rss_url,
        "html_url": html_url,
        "prefix": prefix,
        SKIP_IF_ALREADY_DOWNLOADED: DEFAULT_SKIP_IF_ALREADY_DOWNLOADED,
        "verify_md5": verify_md5,
    }

    @dag(
        # https://airflow.apache.org/docs/apache-airflow/3.2.0/authoring-and-scheduling/timezone.html
        # https://pendulum.eustace.io/docs/#instantiation
        start_date=datetime(year=2022, month=9, day=15, tz='local'),
        catchup=False,
        tags=['owmf', prefix, 'pbf-download', 'produces'],
        params=default_params,
        **kwargs
    )
    def owmf_download():
        """
        # OSM-Wikidata Map Framework DB initialization

        Downloads OSM PBF data

        Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
        """

        @task(do_xcom_push=True)
        def get_source_url(work_dir: str):
            """
            # Get PBF file URL

            Gets the URL of the OSM PBF file to download and derivate the path of the files that will be created later.
            The file urls, names and paths are calculated from the parameters 'pbf_url'/'rss_url'/'html_url'/'prefix'.

            The URL parameters are passed through the params object to allow customization when triggering the DAG.

            The task also calculates the paths of all files that will be generated.
            """
            import re
            from os import makedirs, path

            context = get_current_context()
            params = context["params"] if "params" in context else {}
            if "task_instance" in context:
                ti = context["task_instance"]
            else:
                raise Exception("No task instance found")

            if not path.exists(work_dir):
                print(f"Creating work directory '{work_dir}'")
                try:
                    makedirs(work_dir)
                except Exception as e:
                    print('''
        VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")
        Failed creating folder, did you run airflow-init (e.g. though init.bat) to chown the workdir to the correct user?"
        ====================================================================================================''')
                    raise e

            asset_dir = f'/workdir/{params["prefix"]}'
            if not path.exists(asset_dir):
                print(f"Creating assets directory '{asset_dir}'")
                makedirs(asset_dir)

            source_url = get_last_pbf_url(
                download_url=params["pbf_url"] if "pbf_url" in params else None,
                rss_url=params["rss_url"] if "rss_url" in params else None,
                html_url=params["html_url"] if "html_url" in params else None,
                prefix=params["prefix"]
            )
            # https://linuxhint.com/fetch-basename-python/
            source_basename = path.basename(source_url)
            file_basename = re.sub('\\.torrent$', '', source_basename)
            last_data_update = get_pbf_date(source_basename)
            md5_url = f'{source_url}.md5' if params["verify_md5"] else None

            ti.xcom_push(key='source_url', value=source_url)
            ti.xcom_push(key='md5_url', value=md5_url)
            ti.xcom_push(key='source_basename', value=source_basename)
            ti.xcom_push(key='file_basename', value=file_basename)
            ti.xcom_push(key='source_file_path',
                         value=f"{work_dir}/{source_basename}")
            ti.xcom_push(key='downloaded_file_path',
                         value=f"{work_dir}/{file_basename}")
            ti.xcom_push(key='md5_file_path',
                         value=f"{work_dir}/{source_basename}.md5")
            ti.xcom_push(key='last_data_update', value=last_data_update)

        @task.short_circuit
        def check_whether_to_procede(ti: TaskInstance | None = None):
            """
                # Check whether to procede

                Check whether the available file is newer than the existing asset file: if it is, proceed to download the data, otherwise stop here.
            """
            from re import match

            context = get_current_context()
            skip_if_already_downloaded = "params" in context and context["params"].get(
                SKIP_IF_ALREADY_DOWNLOADED, DEFAULT_SKIP_IF_ALREADY_DOWNLOADED)
            if not exists(pbf_date_path):
                print(
                    f"Proceeding to download (missing date file '{pbf_date_path}')")
                procede = True
            else:
                with open(pbf_date_path) as date_file:
                    existing_date_str = date_file.read().strip()
                new_date_str = ti and ti.xcom_pull(
                    task_ids='get_source_url', key='last_data_update')
                print(
                    f"Existing date: {existing_date_str} (from date file '{pbf_date_path}')")
                print(f"New date: {new_date_str}")
                if skip_if_already_downloaded and new_date_str:
                    # If the OSM data has already been downloaded it will not be downloaded again
                    new_date = parse(new_date_str if match(
                        '^\\d{2}-', new_date_str) == None else '20'+new_date_str)
                    existing_date = parse(existing_date_str if match(
                        '^\\d{2}-', new_date_str) == None else '20'+existing_date_str)
                    procede = new_date > existing_date
                    print('Proceeding to download' if procede else 'NOT proceeding')
                else:
                    procede = True
                    print("Skipping is disabled, proceeding to download")
            return procede
        task_check_whether_to_procede = check_whether_to_procede()
        get_source_url(workdir) >> task_check_whether_to_procede

        @task.branch
        def choose_download_method(ti: TaskInstance | None = None):
            use_torrent = ti and ti.xcom_pull(
                task_ids='get_source_url', key='source_url'
            ).endswith(".torrent")
            return 'download_torrent' if use_torrent else 'download_pbf'
        task_choose_download_method = choose_download_method()
        task_check_whether_to_procede >> task_choose_download_method

        task_download_pbf = BashOperator(
            task_id="download_pbf",
            bash_command="""
                echo "Downloading $sourceUrl"
                curl --fail --verbose --location --max-redirs 5 --progress-bar -o "$sourceFilePath" "$sourceUrl"
                if [ -z "$md5Url"  -o "$md5Url" = 'None' ]; then
                    echo "Empty MD5 checksum URL ('$md5Url'), skipping MD5 verification"
                else
                    echo "Downloading $md5Url"
                    curl --fail --verbose --location --max-redirs 5 -o "$md5FilePath" "$md5Url"
                    if [[ $(cat "$md5FilePath" | cut -f 1 -d ' ') != $(md5sum "$sourceFilePath" | cut -f 1 -d ' ') ]] ; then
                        echo "The md5 sum doesn't match:"
                        cat "$md5FilePath"
                        md5sum "$sourceFilePath"
                        exit 1
                    fi
                fi
            """,
            env={
                "sourceFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_file_path') }}",
                "sourceUrl": "{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
                "md5FilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='md5_file_path') }}",
                "md5Url": "{{ ti.xcom_pull(task_ids='get_source_url', key='md5_url') }}",
            },
            retries=3,
            doc_md="""
# Download the PBF source file

Download the source PBF file from the URL calculated by get_source_url and check that the md5 checksum checks out.

Links:
* [curl documentation](https://curl.se/docs/manpage.html)
* [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-standard/1.11.0/_api/airflow/providers/standard/operators/bash/index.html)
"""
        )
        task_choose_download_method >> task_download_pbf

        task_download_torrent = TransmissionStartTorrentOperator(
            task_id="download_torrent",
            torrent_url="{{ ti.xcom_pull(task_ids='get_source_url', key='source_url') }}",
            download_dir=workdir,
            torrent_daemon_conn_id="torrent_daemon",
            doc_md="""
# Download the PBF source file through torrent

Start the download of the source PBF file from the torrent URL calculated by get_source_url.
"""
        )
        task_choose_download_method >> task_download_torrent

        task_wait_for_torrent_download = TransmissionWaitTorrentSensor(
            task_id="wait_torrent_download",
            retries=20,  # A lot of checks are needed because after download while moving the file Transmission does not respond to API calls
            torrent_hash="{{ ti.xcom_pull(task_ids='download_torrent', key='torrent_hash') }}",
            torrent_daemon_conn_id="torrent_daemon",
            doc_md="""
# Wait for the torrent download to complete 

Check the torrent daemon until the torrent download has completed.
"""
        )
        task_download_torrent >> task_wait_for_torrent_download

        @task(trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS)
        def join_post_download(workdir_eval: str):
            """
            Dummy task for joining the path after the branching done to choose between download methods.
            """
            print(listdir(workdir_eval))
        task_join = join_post_download(workdir)
        [task_download_pbf, task_wait_for_torrent_download] >> task_join

        task_save_pbf = BashOperator(
            task_id="save_pbf",
            bash_command='mkdir -p "$destFolder" && mv "$downloadedFilePath" "$pbfPath" && echo "$date" > "$datePath"',
            env={
                "destFolder": dest_folder,
                "downloadedFilePath": "{{ ti.xcom_pull(task_ids='get_source_url', key='downloaded_file_path') }}",
                "pbfPath": pbf_path,
                "date": "{{ ti.xcom_pull(task_ids='get_source_url', key='last_data_update') }}",
                "datePath": pbf_date_path,
            },
            outlets=pbf_asset
        )
        task_join >> task_save_pbf

        task_wait_cleanup = TimeDeltaSensor(
            task_id='wait_for_cleanup_time',
            delta=timedelta(days=days_before_cleanup),
            trigger_rule=TriggerRule.NONE_SKIPPED,
            deferrable=True,
            doc_md = """
# Wait for the time to cleanup the temporary files

Links:
* [TimeDeltaSensor documentation](https://airflow.apache.org/docs/apache-airflow-providers-standard/1.11.0/sensors/datetime.html)
"""
        )
        task_save_pbf >> task_wait_cleanup

        @task.branch
        def choose_cleanup_method(ti: TaskInstance | None = None):
            use_torrent = ti and ti.xcom_pull(
                task_ids='get_source_url', key='source_url'
            ).endswith(".torrent")
            return 'cleanup_torrent' if use_torrent else 'cleanup_pbf'
        task_choose_cleanup_method = choose_cleanup_method()
        task_wait_cleanup >> task_choose_cleanup_method

        task_cleanup_torrent = TransmissionRemoveTorrentOperator(
            task_id="cleanup_torrent",
            torrent_hash="{{ ti.xcom_pull(task_ids='download_torrent', key='torrent_hash') }}",
            torrent_daemon_conn_id="torrent_daemon",
            doc_md="""
    # Remove the torrent

    Remove the torrent from the DAG run folder and from the torrent daemon
"""
        )
        task_choose_cleanup_method >> task_cleanup_torrent

        @task
        def cleanup_pbf(workdir_eval: str) -> None:
            """
            # Cleanup the work directory

            Remove the DAG run folder
            """
            from shutil import rmtree
            print(f"Deleting {workdir_eval}")
            rmtree(workdir_eval)
        task_choose_cleanup_method >> cleanup_pbf(workdir)

    return owmf_download()
