<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;

class DirectEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(BoundingBox $bbox, array $wikidataProps, WikidataConfig $config, ?string $language = null)
    {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $directProperties = implode(" ", array_map(function (string $prop): string {
            return "wdt:$prop";
        }, $wikidataProps));
        $labelQuery = empty($language) ? "" : "OPTIONAL { ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='$language') }";
        $maxElements = $config->getMaxElements();
        $limitClause = $maxElements ? "LIMIT $maxElements" : "";

        $baseQuery = new JSONWikidataQuery(
            "SELECT DISTINCT
                ?item
                ?itemLabel
                ?location
                ?commons
                ?picture
                ?etymology (?item AS
                ?from_entity)
                ?from_prop
            WHERE {
                VALUES ?from_prop { $directProperties }
                ?item ?from_prop ?etymology.
                SERVICE wikibase:box {
                    ?item wdt:P625 ?location.
                    bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                    bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
                } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
                OPTIONAL { ?item wdt:P373 ?commons }
                OPTIONAL { ?item wdt:P18 ?picture }
                $labelQuery
            }
            $limitClause",
            $config
        );
        parent::__construct($bbox, $baseQuery, $language);
    }
}
