INSERT INTO oem.etymology (
    et_el_id,
    et_wd_id,
    et_from_el_id,
    et_from_osm,
    et_from_wikidata,
    et_from_name_etymology,
    et_from_name_etymology_consists,
    et_from_subject,
    et_from_subject_consists,
    et_from_wikidata_named_after,
    et_from_wikidata_dedicated_to,
    et_from_wikidata_commemorates,
    et_from_wikidata_wd_id,
    et_from_wikidata_prop_cod
) SELECT
    ew_el_id,
    wd_id,
    MIN(ew_el_id) AS from_el_id,
    BOOL_OR(wna_from_prop_cod IS NULL) AS from_osm, -- derived directly from OSM
    BOOL_OR(wna_from_prop_cod IS NOT NULL) AS from_wikidata, -- derived through Wikidata
    BOOL_OR(wna_from_prop_cod IS NULL AND ew_from_name_etymology) AS from_name_etymology, -- derived directly from OSM ('name:etymology')
    BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527' AND ew_from_name_etymology) AS from_name_etymology_consists, -- derived through OSM ('name:etymology') and then Wikidata ('consists')
    BOOL_OR(wna_from_prop_cod IS NULL AND ew_from_subject) AS from_subject, -- derived directly from OSM ('subject')
    BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P527' AND ew_from_subject) AS from_subject_consists, -- derived through OSM ('subject') and then Wikidata ('consists')
    BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P138' AND ew_from_wikidata) AS from_wikidata_named_after, -- derived through OSM ('wikidata') and then Wikidata ('named after')
    BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P825' AND ew_from_wikidata) AS from_wikidata_dedicated_to, -- derived through OSM ('wikidata') and then Wikidata ('dedicated to')
    BOOL_OR(wna_from_prop_cod IS NOT NULL AND wna_from_prop_cod='P547' AND ew_from_wikidata) AS from_wikidata_commemorates, -- derived through OSM ('wikidata') and then Wikidata ('commemorates')
    MIN(from_wd_id) AS from_wikidata_wd_id,
    MIN(wna_from_prop_cod) AS from_wikidata_prop_cod
FROM (
    SELECT DISTINCT
        ew_el_id,
        wd_id,
        ew_from_name_etymology,
        ew_from_subject,
        ew_from_wikidata,
        NULL::BIGINT AS from_wd_id,
        NULL::VARCHAR AS wna_from_prop_cod
    FROM oem.element_wikidata_cods
    JOIN oem.wikidata ON ew_wikidata_cod = wd_wikidata_cod
    WHERE ew_from_name_etymology OR ew_from_subject
    UNION
    SELECT DISTINCT
        ew.ew_el_id,
        nawd.wd_id,
        ew_from_name_etymology,
        ew_from_subject,
        ew_from_wikidata,
        wd.wd_id AS from_wd_id,
        wna_from_prop_cod
    FROM oem.element_wikidata_cods AS ew
    JOIN oem.wikidata AS wd ON ew.ew_wikidata_cod = wd.wd_wikidata_cod
    JOIN oem.wikidata_named_after AS wna ON wd.wd_id = wna.wna_wd_id
    JOIN oem.wikidata AS nawd ON wna.wna_named_after_wd_id = nawd.wd_id
    WHERE wna_from_prop_cod IS NOT NULL
    AND wna_from_prop_cod='P527'
    AND (ew_from_name_etymology OR ew_from_subject)
    UNION
    SELECT DISTINCT
        ew.ew_el_id,
        nawd.wd_id,
        ew_from_name_etymology,
        ew_from_subject,
        ew_from_wikidata,
        wd.wd_id AS from_wd_id,
        wna_from_prop_cod
    FROM oem.element_wikidata_cods AS ew
    JOIN oem.wikidata AS wd ON ew.ew_wikidata_cod = wd.wd_wikidata_cod
    JOIN oem.wikidata_named_after AS wna ON wd.wd_id = wna.wna_wd_id
    JOIN oem.wikidata AS nawd ON wna.wna_named_after_wd_id = nawd.wd_id
    WHERE wna_from_prop_cod IS NOT NULL
    AND wna_from_prop_cod!='P527'
    AND ew_from_wikidata
) AS x
GROUP BY ew_el_id, wd_id;
