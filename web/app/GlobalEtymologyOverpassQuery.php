<?php
require_once(__DIR__."/OverpassQuery.php");
require_once(__DIR__ . "/OverpassEtymologyQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GlobalEtymologyOverpassQuery extends OverpassQuery {
    /**
     * @param string $endpointURL
     */
    public function __construct($endpointURL) {
        parent::__construct(
            "[out:json][timeout:25];
            (
              node['name:etymology:wikidata'];
              way['name:etymology:wikidata'];
              relation['name:etymology:wikidata'];
            );
            out body;
            >;
            out skel qt;",
            $endpointURL
        );
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send() {
        $res = parent::send();
        if(!$res->hasResult()) {
            throw new Exception("Overpass query failed: $res");
        }
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getResult());
    }
}
