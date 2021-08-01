<?php
require_once("./OverpassQuery.php");

class GlobalEtymologyOverpassQuery extends OverpassQuery {
    public function __construct() {
        parent::__construct(
            "[out:json][timeout:25];
            (
              node['name:etymology:wikidata'];
              way['name:etymology:wikidata'];
              relation['name:etymology:wikidata'];
            );
            out body;
            >;
            out skel qt;"
        );
    }
}
