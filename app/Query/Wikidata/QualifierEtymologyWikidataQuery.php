<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;

class QualifierEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(BoundingBox $bbox, string $wikidataProperty, WikidataConfig $config, ?string $imageProperty = null)
    {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $commonsQuery = empty($imageProperty) ? "" : "OPTIONAL { ?etymology wdt:$imageProperty ?picture. }";
        $maxElements = $config->getMaxElements();
        $limitClause = $maxElements ? "LIMIT $maxElements" : "";

        $baseQuery = new JSONWikidataQuery(
            "SELECT DISTINCT
                ?location
                ?picture
                ?etymology
                (?item AS ?from_entity)
                (wdt:$wikidataProperty AS ?from_prop)
            WHERE {
                ?etymology p:$wikidataProperty ?stmt.
                SERVICE wikibase:box {
                    ?stmt pq:P625 ?location.
                    bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                    bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
                } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
                $commonsQuery
            }
            $limitClause",
            $config
        );
        parent::__construct($bbox, $baseQuery);
    }
}
