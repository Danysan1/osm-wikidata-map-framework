<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\Query\CurlQuery;

/**
 * Wikidata query sent via HTTP request.
 * 
 * @see https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial
 * @see https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples
 * @see https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples/advanced
 * @see https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_optimization
 */
abstract class WikidataQuery extends CurlQuery
{
    private static string $method = "POST";
    private static string $userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36";

    public function __construct(string $query, string $format, WikidataConfig $config)
    {
        /*$classBaseName = (new \ReflectionClass($this))->getShortName();
        file_put_contents("$classBaseName.tmp.rq", $query);*/

        parent::__construct(
            ["format" => $format, "query" => self::getMinifiedQuery($query)],
            $config->getEndpoint(),
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
