from airflow.operators.python import PythonOperator
from airflow.models.taskinstance import TaskInstance

class TransmissionStartTorrentOperator(PythonOperator):
    """
    # Operator to start the download of a torrent in a Transmision daemon
    
    Links:
    * [transmission-rpc Client documentation](https://transmission-rpc.readthedocs.io/en/v3.4.0/client.html)

    
    Torrent download method explored before choosing this one:

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
    """
    
    def __init__(self, torrent_url:str, download_dir:str, torrent_daemon_conn_id:str, **kwargs) -> None:
        super().__init__(
            python_callable = start_torrent_download,
            op_kwargs = {
                "torrent_url": torrent_url,
                "download_dir": download_dir,
                "torrent_daemon_conn_id": torrent_daemon_conn_id
            },
            **kwargs
        )

def start_torrent_download(torrent_url:str, download_dir:str, torrent_daemon_conn_id:str, ti:TaskInstance, **context):
    from transmission_rpc import Client
    conn = context["conn"].get(torrent_daemon_conn_id)
    c = Client(host=conn.host, port=conn.port)
    torrent = c.add_torrent(torrent_url, download_dir=download_dir)
    ti.xcom_push(key="torrent_hash", value=torrent.hashString)
