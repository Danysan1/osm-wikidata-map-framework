from OsmDockerOperator import OsmDockerOperator

class OsmiumExportOperator(OsmDockerOperator):
    """
    ## Operator for `osmium export`

    Execute `osmium export` on a dedicated Docker container

    Links:
    * [osmium export documentation](https://docs.osmcode.org/osmium/latest/osmium-export.html)
    * [osmium export documentation](https://manpages.ubuntu.com/manpages/jammy/man1/osmium-export.1.html)
    * [index/cache documentation](https://docs.osmcode.org/osmium/latest/osmium-index-types.html)
    * [beyanora/osmtools Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    """
    def __init__(self, source_path:str, dest_path:str, cache_path:str = None, config_path:str = None, **kwargs) -> None:
        cache_str = f"--index-type='sparse_file_array,{cache_path}'" if cache_path != None else ""
        config_str = f"--config='{config_path}'" if config_path != None else ""
        super().__init__(
            image='beyanora/osmtools:20210401',
            command = f"osmium export --verbose --progress --overwrite -o '{dest_path}' -f 'pg' {config_str} --add-unique-id='counter' {cache_str} --show-errors '{source_path}'",
            **kwargs
        )