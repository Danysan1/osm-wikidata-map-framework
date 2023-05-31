from airflow.operators.python import PythonOperator
from airflow.models.taskinstance import TaskInstance

class TransmissionRemoveTorrentOperator(PythonOperator):
    """
    # Removes a torrent from a Transmision daemon
    
    Links:
    * [transmission-rpc Client documentation](https://transmission-rpc.readthedocs.io/en/v3.4.0/client.html)
    * [transmission-rpc Torrent documentation](https://transmission-rpc.readthedocs.io/en/v3.4.0/torrent.html)
    """

    def __init__(self, torrent_hash:str, torrent_daemon_conn_id:str, **kwargs) -> None:
        super().__init__(
            python_callable = self.remove_torrent,
            op_kwargs = {
                "torrent_hash": torrent_hash,
                "torrent_daemon_conn_id": torrent_daemon_conn_id
            },
            **kwargs
        )

    def remove_torrent(torrent_hash:str, torrent_daemon_conn_id:str, **context):
        from transmission_rpc import Client
        conn = context["conn"].get(torrent_daemon_conn_id)
        c = Client(host=conn.host, port=conn.port)
        c.remove_torrent(torrent_hash, delete_data=True)