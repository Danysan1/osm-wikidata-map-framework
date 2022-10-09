from OsmDockerOperator import OsmDockerOperator

class OsmiumTagsFilterOperator(OsmDockerOperator):
    """
    ## Operator for `osmium tags-filter`

    Execute `osmium tags-filter` on a dedicated Docker container

    Links:
    * [osmium tags-filter documentation](https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html)
    * [osmium tags-filter documentation](https://manpages.ubuntu.com/manpages/jammy/man1/osmium-tags-filter.1.html)
    * [beyanora/osmtools Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    """
    def __init__(self, source_path:str, dest_path:str, tags:list, invert_match:bool = False, remove_tags:bool = False, **kwargs) -> None:
        invert_match_str = "--invert-match" if invert_match else ""
        remove_tags_str = "--remove-tags" if remove_tags else ""
        quoted_tags = ' '.join(map(lambda tag: f"'{tag}'", tags))
        super().__init__(
            image='beyanora/osmtools:20210401',
            command = f"osmium tags-filter --verbose --progress --input-format=pbf --output-format=pbf {invert_match_str} {remove_tags_str} --output='{dest_path}' --overwrite '{source_path}' {quoted_tags}",
            **kwargs
        )