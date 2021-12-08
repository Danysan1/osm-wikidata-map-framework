<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../cache/CSVCachedStringSetXMLQuery.php");
require_once(__DIR__ . "/EtymologyIDListWikidataFullQuery.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");
require_once(__DIR__ . "/../../StringSet.php");
require_once(__DIR__ . "/../../Configuration.php");

use \App\Query\Cache\CSVCachedStringSetXMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Configuration;
use \App\Query\Wikidata\EtymologyIDListWikidataFullQuery;

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
     * @var Configuration $config
     */
    private $config;

    /**
     * @param string $language
     * @param string $endpointURL
     * @param string $cacheFileBasePath
     * @param Configuration $config
     */
    public function __construct($language, $endpointURL, $cacheFileBasePath, $config)
    {
        $this->language = $language;
        $this->endpointURL = $endpointURL;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->config = $config;
    }

    public function create(StringSet $input): StringSetXMLQuery
    {
        $baseQuery =  new EtymologyIDListWikidataFullQuery($input, $this->language, $this->endpointURL);
        return new CSVCachedStringSetXMLQuery($baseQuery, $this->cacheFileBasePath, $this->config);
    }
}
