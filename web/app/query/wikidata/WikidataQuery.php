<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../CurlQuery.php");

use App\Query\CurlQuery;

/**
 * Wikidata query sent via HTTP request.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class WikidataQuery extends CurlQuery
{
    private static $method = "POST";
    private static $userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36";

    public function __construct(string $query, string $format, string $endpointURL)
    {
        //file_put_contents('WikidataQuery.tmp.rq', $query);
        parent::__construct(
            ["format" => $format, "query" => self::getMinifiedQuery($query)],
            $endpointURL,
            self::$method,
            self::$userAgent
        );
    }

    protected static function getMinifiedQuery(string $original): string
    {
        $minified = preg_replace('/(?:^\s+)|(?:\s*#[\/\s\w\(\),\'\:\.]+$)/m', "", $original);
        if (empty($minified)) {
            error_log("getMinifiedQuery:" . PHP_EOL . $original . PHP_EOL . $minified);
            throw new \Exception("Query minimization led to an empty string");
        }
        return $minified;
    }
}
