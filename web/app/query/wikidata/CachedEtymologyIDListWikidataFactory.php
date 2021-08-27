<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../decorators/CachedStringSetXMLQuery.php");
require_once(__DIR__ . "/EtymologyIDListWikidataQuery.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");
require_once(__DIR__ . "/../../StringSet.php");

use \App\Query\Decorators\CachedStringSetXMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Query\Wikidata\EtymologyIDListWikidataQuery;

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedEtymologyIDListWikidataFactory implements StringSetXMLQueryFactory
{
    /**
     * @var string $language
     */
    private $language;

    /**
     * @var string $endpointURL
     */
    private $endpointURL;
    /**
     * @var string $cacheFileBasePath
     */
    private $cacheFileBasePath;

    /**
     * @var int $cacheTimeoutHours
     */
    private $cacheTimeoutHours;

    /**
     * @param string $language
     * @param string $endpointURL
     * @param string $cacheFileBasePath
     * @param int $cacheTimeoutHours
     */
    public function __construct($language, $endpointURL, $cacheFileBasePath, $cacheTimeoutHours)
    {
        $this->language = $language;
        $this->endpointURL = $endpointURL;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->cacheTimeoutHours = $cacheTimeoutHours;
    }

    public function create(StringSet $input): StringSetXMLQuery
    {
        $baseQuery =  new EtymologyIDListWikidataQuery($input, $this->language, $this->endpointURL);
        return new CachedStringSetXMLQuery($baseQuery, $this->cacheFileBasePath, $this->cacheTimeoutHours);
    }
}
