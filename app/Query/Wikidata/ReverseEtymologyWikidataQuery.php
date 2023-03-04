<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;

class ReverseEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(BoundingBox $bbox, string $wikidataProperty, string $endpointURL, ?string $imageProperty = null, ?string $language = null)
    {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $commonsQuery = empty($imageProperty) ? "" : "OPTIONAL { ?etymology wdt:$imageProperty ?commons }";
        $labelQuery = empty($language) ? "" : "OPTIONAL { ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='$language') }";
        $baseQuery = new JSONWikidataQuery(
            "SELECT DISTINCT ?item ?itemLabel ?location ?commons ?etymology
            WHERE {
                ?etymology p:$wikidataProperty ?stmt.
                MINUS { ?stmt pq:P625 []. }
                ?stmt ps:$wikidataProperty ?item.
                MINUS { ?item wdt:P31 wd:Q675824. }
                MINUS { ?item wdt:P31 wd:Q39614. }
                SERVICE wikibase:box {
                ?item wdt:P625 ?location.
                bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
                } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
                $commonsQuery
                $labelQuery
            }",
            $endpointURL
        );
        parent::__construct($bbox, $baseQuery);
    }
}
