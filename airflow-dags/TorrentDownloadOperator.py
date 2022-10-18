from OsmDockerOperator import OsmDockerOperator

class TorrentDownloadOperator(OsmDockerOperator):
    """
    ## Operator for downloading torrents

    Execute a command to download a file via torrent on a dedicated Docker container

    Links:
    * [transmission-cli documentation](https://manpages.ubuntu.com/manpages/bionic/man1/transmission-cli.1.html)
    * [lftp documentation](http://lftp.yar.ru/lftp-man.html)
    * [aria2c documentation](https://aria2.github.io/manual/en/html/aria2c.html#bittorrent-metalink-options)
    * [mikesplain/transmission-cli Docker image details](https://hub.docker.com/r/mikesplain/transmission-cli/tags)
    """
    def __init__(self, torrent_url:str, dest_folder:str="/workdir/", **kwargs) -> None:
        super().__init__(
            #image='tanel/transmission-remote:latest',
            #command = f"transmission-remote --download-dir '{dest_folder}' --verify '{torrent_url}' && ls -l {dest_folder}/*",
            image='minidocks/lftp:latest',
            command = f"lftp -c torrent -O '{dest_folder}' '{torrent_url}'",
            # image='207m/aria2c:latest',
            # command = f"aria2c --dir '{dest_folder}' '{torrent_url}'",
            **kwargs
        )