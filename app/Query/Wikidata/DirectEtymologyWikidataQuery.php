<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;

class DirectEtymologyWikidataQuery extends EtymologyWikidataQuery
{
  public function __construct(BoundingBox $bbox, array $wikidataProps, string $language, string $endpointURL)
  {
    $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
    $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
    $directProperties = implode("|", array_map(function (string $prop): string {
      return "wdt:$prop";
    }, $wikidataProps));
    $baseQuery = new JSONWikidataQuery(
      "SELECT DISTINCT ?item ?itemLabel ?location ?commons ?etymology
            WHERE {
              ?item $directProperties ?etymology.
              SERVICE wikibase:box {
                ?item wdt:P625 ?location.
                bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
              } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
              OPTIONAL { ?item wdt:P18|wdt:P94|wdt:P242|wdt:P15|wdt:P41 ?commons }
              OPTIONAL {
                ?wikidata rdfs:label ?itemLabel.
                FILTER(lang(?itemLabel)='$language').
              }
            }",
      $endpointURL
    );
    parent::__construct($bbox, $baseQuery);
  }
}
