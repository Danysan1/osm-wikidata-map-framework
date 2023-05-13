<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;

class AllIndirectEtymologyWikidataQuery extends EtymologyWikidataQuery
{
    public function __construct(
        BoundingBox $bbox,
        string $wikidataProperty,
        WikidataConfig $config,
        ?string $imageProperty = null,
        ?string $defaultLanguage = null,
        ?string $language = null
    ) {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $pictureQuery = empty($imageProperty) ? "" : "OPTIONAL { ?etymology wdt:$imageProperty ?picture. }";
        $labelQuery = EtymologyWikidataQuery::generateItemLabelQuery($defaultLanguage, $language);
        $maxElements = $config->getMaxElements();
        $limitClause = $maxElements ? "LIMIT $maxElements" : "";

        $baseQuery = new JSONWikidataQuery(
            "SELECT
                ?etymology
                ?item
                (SAMPLE(?itemLabel) AS ?itemLabel)
                (SAMPLE(?location) AS ?location)
                (SAMPLE(?commons) AS ?commons)
                (SAMPLE(?picture) AS ?picture)
                (?etymology AS ?from_entity)
                (wdt:$wikidataProperty AS ?from_prop)
            WITH { 
                SELECT ?etymology ?location ?commons ?picture
                WHERE {
                    ?etymology p:$wikidataProperty ?stmt.
                    MINUS { ?stmt pq:P582 []. } # Ignore if it has a end date
                    SERVICE wikibase:box {
                        ?stmt pq:P625 ?location.
                        bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral;
                            wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral.
                    } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
                    OPTIONAL { ?stmt pq:P373 ?commons. }
                    $pictureQuery
                }
                $limitClause
            } AS %qualifier
            WITH {
                SELECT ?etymology ?location ?item ?itemLabel ?commons ?picture
                WHERE {
                    ?etymology p:$wikidataProperty ?stmt.
                    MINUS { ?stmt pq:P625|pq:P582 []. }
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
                $limitClause
            } AS %reverse
            WHERE {
                { INCLUDE %qualifier. } UNION { INCLUDE %reverse. }
            }
            GROUP BY ?item ?etymology
            $limitClause",
            $config
        );
        parent::__construct($bbox, $baseQuery, empty($language) ? $defaultLanguage : $language);
    }
}
