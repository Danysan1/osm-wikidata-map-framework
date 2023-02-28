<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;

class ReverseEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(BoundingBox $bbox, string $wikidataProperty, string $endpointURL, ?string $imageProperty = null)
    {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $commonsQuery = "OPTIONAL { ?etymology wdt:$imageProperty ?commons. }";
        $baseQuery = new JSONWikidataQuery(
            "SELECT DISTINCT ?location ?commons ?etymology
            WHERE {
              ?etymology p:$wikidataProperty ?burial.
              SERVICE wikibase:box {
                ?burial pq:P625 ?location.
                bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
              } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
              $commonsQuery
            }",
            $endpointURL
        );
        parent::__construct($bbox, $baseQuery);
    }
}
