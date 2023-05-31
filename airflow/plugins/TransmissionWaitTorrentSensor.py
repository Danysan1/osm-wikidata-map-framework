from airflow.sensors.python import PythonSensor

class TransmissionWaitTorrentSensor(PythonSensor):
    """
    # Operator to check whether a torrent in a Transmision daemon has finished downloading
    
    Links:
    * [transmission-rpc Client documentation](https://transmission-rpc.readthedocs.io/en/v3.4.0/client.html)
    * [transmission-rpc Torrent documentation](https://transmission-rpc.readthedocs.io/en/v3.4.0/torrent.html)
    """

    def __init__(self, torrent_hash:str, torrent_daemon_conn_id:str, **kwargs) -> None:
        super().__init__(
            python_callable = self.check_if_torrent_is_complete,
            op_kwargs = {
                "torrent_hash": torrent_hash,
                "torrent_daemon_conn_id": torrent_daemon_conn_id
            },
            **kwargs
        )

    def check_if_torrent_is_complete(torrent_hash:str, torrent_daemon_conn_id:str, **context) -> bool:
        from transmission_rpc import Client
        conn = context["conn"].get(torrent_daemon_conn_id)
        c = Client(host=conn.host, port=conn.port)
        torrent = c.get_torrent(torrent_hash)
        return torrent.status == "seeding"