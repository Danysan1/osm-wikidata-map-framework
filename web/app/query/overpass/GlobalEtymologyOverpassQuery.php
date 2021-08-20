<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassQuery.php");
require_once(__DIR__ . "/../../result/overpass/OverpassEtymologyQueryResult.php");

use \App\Query\Overpass\OverpassQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * OverpassQL query that retrieves all the details of any item which has an etymology around the globe.
 * 
 * Create mostly out of curiosity.
 * !Use with caution!
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GlobalEtymologyOverpassQuery extends OverpassQuery
{
    /**
     * @param string $endpointURL
     */
    public function __construct($endpointURL)
    {
        parent::__construct(
            "[out:json][timeout:25];
            (
              //node['name:etymology:wikidata'];
              way['name:etymology:wikidata'];
              //relation['name:etymology:wikidata'];
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
    public function send()
    {
        $res = parent::send();
        if (!$res->isSuccessful() || !$res->hasResult()) {
            error_log("GlobalEtymologyOverpassQuery: Overpass query failed: $res");
            throw new \Exception("Overpass query failed");
        }
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getResult());
    }
}
