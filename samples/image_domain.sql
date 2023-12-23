SELECT SUBSTRING(osm_tags->>'image' FROM 0 FOR 30) as str, COUNT(*) AS n
FROM owmf.osmdata
GROUP BY str
ORDER BY n DESC
LIMIT 20