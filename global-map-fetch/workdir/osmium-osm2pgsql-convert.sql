-- Find malformed wikidata tags
SELECT DISTINCT REGEXP_SPLIT_TO_TABLE(tags->'wikidata',';') FROM planet_osm_line WHERE tags->'wikidata' NOT LIKE 'Q%'
UNION
SELECT DISTINCT REGEXP_SPLIT_TO_TABLE(tags->'subject:wikidata',';') FROM planet_osm_line WHERE tags->'subject:wikidata' NOT LIKE 'Q%'
UNION
SELECT DISTINCT REGEXP_SPLIT_TO_TABLE(tags->'name:etymology:wikidata',';') FROM planet_osm_line WHERE tags->'name:etymology:wikidata' NOT LIKE 'Q%';
