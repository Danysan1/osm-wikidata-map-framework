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
abstract class BaseWikidataQuery extends CurlQuery implements WikidataQuery
{
    private const HTTP_METHOD = "POST";
    private const HTTP_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36";

    private string $minifiedQuery;

    public function __construct(string $query, string $format, WikidataConfig $config)
    {
        /*$classBaseName = (new \ReflectionClass($this))->getShortName();
        file_put_contents("$classBaseName.tmp.rq", $query);*/

        $this->minifiedQuery = self::minifyWikidataQuery($query);
        parent::__construct(
            ["format" => $format, "query" => $this->minifiedQuery],
            $config->getEndpoint(),
            self::HTTP_METHOD,
            self::HTTP_USER_AGENT // Mandatory for Wikidata API calls (see https://meta.wikimedia.org/wiki/User-Agent_policy )
        );
    }

    public function getWikidataQuery(): string
    {
        return $this->minifiedQuery;
    }

    protected static function minifyWikidataQuery(string $fullQuery): string
    {
        $minified = preg_replace('/\s*#[\/\s\w\(\)\'\.\-:,#]+$/m', "", $fullQuery);
        $minified = preg_replace('/\n\s+/m', " ", $minified);
        if (empty($minified)) {
            error_log($fullQuery);
            throw new \Exception("SPARQL query minimization led to an empty string");
        } else {
            // error_log("minifyWikidataQuery successfully minified the query:");
            // error_log($minified);
        }
        return $minified;
    }
}
