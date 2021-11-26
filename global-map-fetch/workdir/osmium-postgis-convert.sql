-- Find malformed wikidata tags
SELECT DISTINCT REGEXP_SPLIT_TO_TABLE(tags->>'wikidata',';') FROM osmdata WHERE tags->>'wikidata' NOT LIKE 'Q%'
UNION
SELECT DISTINCT REGEXP_SPLIT_TO_TABLE(tags->>'subject:wikidata',';') FROM osmdata WHERE tags->>'subject:wikidata' NOT LIKE 'Q%'
UNION
SELECT DISTINCT REGEXP_SPLIT_TO_TABLE(tags->>'name:etymology:wikidata',';') FROM osmdata WHERE tags->>'name:etymology:wikidata' NOT LIKE 'Q%';
