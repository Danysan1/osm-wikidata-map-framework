from OsmDockerOperator import OsmDockerOperator

class TorrentDownloadOperator(OsmDockerOperator):
    """
    ## Operator for downloading torrents

    Execute `transmission-cli` to download a file via torrent on a dedicated Docker container

    Links:
    * [transmission-cli documentation](https://manpages.ubuntu.com/manpages/bionic/man1/transmission-cli.1.html)
    * [mikesplain/transmission-cli Docker image details](https://hub.docker.com/r/mikesplain/transmission-cli/tags)
    """
    def __init__(self, torrent_url:str, dest_folder:str="/workdir/", **kwargs) -> None:
        super().__init__(
            image='mikesplain/transmission-cli:latest',
            command = f"transmission-cli --download-dir '{dest_folder}' --verify '{torrent_url}'",
            **kwargs
        )