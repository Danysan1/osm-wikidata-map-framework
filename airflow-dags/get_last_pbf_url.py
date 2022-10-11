def get_last_pbf_url(download_url:str=None, rss_url:str=None, html_url:str=None, prefix:str='', download_ext:str="osm.pbf") -> str:
    """
    ## Get PBF file URL

    Gets the URL of the OSM PBF file to download.
    The file urls, names and paths are calculated from the parameters `pbf_url`/`rss_url`/`html_url`.
    """
    from urllib.request import urlopen
    from re import findall
    from os.path import basename

    source_url:str = None
    if download_url:
        if not download_url.endswith(f'.{download_ext}'):
            raise Exception(f"The 'download_url' must end with '.{download_ext}':", download_url)
        
        print("Using 'download_url' as source URL: ", download_url)
        source_url = download_url
    elif rss_url:
        if not rss_url.endswith(".xml") and not rss_url.endswith(".rss"):
            raise Exception(f"The 'rss_url' must end with '.xml' or '.rss':", rss_url)
        
        print("Fetching the source URL from 'rss_url':", rss_url)
        from xml.etree.ElementTree import fromstring
        with urlopen(rss_url) as response:
            xml_content = response.read()
            root = fromstring(xml_content)
            links = root.findall("./rss/channel/item/link")
            print("Links found:", links)
            urls = [link.text for link in links]
            urls = list(filter(lambda f: f!="" and basename(f).startswith(prefix) and f.endswith(f'.{download_ext}'), urls))

            if len(urls) > 0:
                urls.sort(reverse=True)
                print("URLs found:", urls)
                source_url = urls[0]
    elif html_url:
        print("Fetching the source URL from 'html_url':", html_url)
        with urlopen(html_url) as response:
            html_content = response.read().decode('utf-8')
            regex_pattern = f'href="({prefix}[\w-]+[\d+]\.{download_ext})"'
            files = findall(regex_pattern, html_content)
            print("Search pattern and result:", regex_pattern, files)

            if len(files) > 0:
                files.sort(reverse=True)
                print("Files found:", files)
                source_url = f"{html_url}/{files[0]}"
    else:
        print("Unable to get the source URL, you must specify at least one among 'download_url', 'rss_url' or 'html_url'")
    
    if isinstance(source_url, str) and source_url.endswith(f".{download_ext}"):
        print("Using URL:", source_url)
    else:
        raise Exception("Source URL search failed", source_url)
    
    return source_url

def get_pbf_date(pbf_basename:str) -> str:
    """
    ## Gets the date of the data in the OSM PBF file
    
    Returns the update date of the data in the OSM PBF file, if available in the name of the file.
    If the date is not available in the name of the file (for example if the "*-latest.osm.pbf" has been chosen) uses today's, date.  
    """
    from re import search
    from pendulum import now

    date_match = search('-(\d{2})(\d{2})(\d{2})\.', pbf_basename)
    if date_match != None:
        last_data_update = f'20{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'
    else:
        last_data_update = now('local').strftime('%y-%m-%d') # https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior
    
    return last_data_update