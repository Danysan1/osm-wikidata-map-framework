<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;

class ReverseEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(
        BoundingBox $bbox,
        string $wikidataProperty,
        WikidataConfig $config,
        ?string $defaultLanguage = null,
        ?string $language = null
    ) {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $maxElements = $config->getMaxElements();
        $labelQuery = EtymologyWikidataQuery::generateItemLabelQuery($defaultLanguage, $language);
        $limitClause = $maxElements ? "LIMIT $maxElements" : "";

        $baseQuery = new JSONWikidataQuery(
            "SELECT
                ?item
                (SAMPLE(?itemLabel) AS ?itemLabel)
                (SAMPLE(?location) AS ?location)
                (SAMPLE(?commons) AS ?commons)
                (SAMPLE(?picture) AS ?picture)
                ?etymology
                (?etymology AS ?from_entity)
                (wdt:$wikidataProperty AS ?from_prop)
            WHERE {
                ?etymology p:$wikidataProperty ?stmt.
                MINUS { ?stmt pq:P582 []. }
                ?stmt ps:$wikidataProperty ?item.
                SERVICE wikibase:box {
                    ?item wdt:P625 ?location.
                    bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral;
                        wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral.
                } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
                OPTIONAL { ?item wdt:P373 ?commons. }
                OPTIONAL { ?item wdt:P18 ?picture. }
                $labelQuery
            }
            GROUP BY ?item ?etymology
            $limitClause",
            $config
        );
        parent::__construct($bbox, $baseQuery, empty($language) ? $defaultLanguage : $language);
    }
}
