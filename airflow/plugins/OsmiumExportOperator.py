from OsmDockerOperator import OsmDockerOperator


class OsmiumExportOperator(OsmDockerOperator):
    """
    ## Operator for `osmium export`

    Execute `osmium export` on a dedicated Docker container

    Links:
    * [osmium export documentation](https://docs.osmcode.org/osmium/latest/osmium-export.html)
    * [osmium export documentation](https://manpages.ubuntu.com/manpages/jammy/man1/osmium-export.1.html)
    * [index/cache documentation](https://docs.osmcode.org/osmium/latest/osmium-index-types.html)
    * Possible Docker images:
    * - [beyanora/osmtools](https://hub.docker.com/r/beyanora/osmtools) => stuck to 2021 / 1.13.1, requires "osmium" at the beginning of the command
    * - [iboates/osmium](https://hub.docker.com/r/iboates/osmium) => updated (1.18.0 as of 2026)
    """
    def __init__(self, source_path:str, dest_path:str, cache_path:str|None = None, config_path:str|None = None, **kwargs) -> None:
        cache_str = f"--index-type='sparse_file_array,{cache_path}'" if cache_path != None else ""
        config_str = f"--config='{config_path}'" if config_path != None else ""
        super().__init__(
            image='iboates/osmium:1.18.0',
            command = f"export --verbose --progress --overwrite -o '{dest_path}' -f 'pg' {config_str} --add-unique-id='counter' {cache_str} --show-errors '{source_path}'",
            **kwargs
        )