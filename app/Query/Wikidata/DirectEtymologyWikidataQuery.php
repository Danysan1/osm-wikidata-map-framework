<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;

class DirectEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(
        BoundingBox $bbox,
        array $wikidataProps,
        WikidataConfig $config,
        ?string $defaultLanguage = null,
        ?string $language = null
    ) {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $directProperties = implode(" ", array_map(function (string $prop): string {
            return "wdt:$prop";
        }, $wikidataProps));
        $labelQuery = EtymologyWikidataQuery::generateItemLabelQuery($defaultLanguage, $language);
        $maxElements = $config->getMaxElements();
        $limitClause = $maxElements ? "LIMIT $maxElements" : "";

        $baseQuery = new JSONWikidataQuery(
            "SELECT DISTINCT
                ?item
                ?itemLabel
                ?location
                ?commons
                ?picture
                ?osmRelation
                ?etymology
                (?item AS ?from_entity)
                ?from_prop
            WHERE {
                VALUES ?from_prop { $directProperties }
                ?item ?from_prop ?etymology.
                SERVICE wikibase:box {
                    ?item wdt:P625 ?location.
                    bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                    bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
                } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
                FILTER (isIRI(?etymology) && !wikibase:isSomeValue(?etymology))
                OPTIONAL { ?item wdt:P373 ?commons }
                OPTIONAL { ?item wdt:P18 ?picture }
                OPTIONAL { ?item wdt:P402 ?osmRelation }
                $labelQuery
            }
            $limitClause",
            $config
        );
        parent::__construct($bbox, $baseQuery, empty($language) ? $defaultLanguage : $language);
    }
}
