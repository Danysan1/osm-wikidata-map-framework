<?php
require_once("./OverpassQuery.php");

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
}
