<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\Caching\CSVCachedStringSetXMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Config\Configuration;
use \App\Query\Wikidata\EtymologyIDListXMLWikidataQuery;

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
        $baseQuery =  new EtymologyIDListXMLWikidataQuery($input, $this->language, $this->endpointURL);
        return new CSVCachedStringSetXMLQuery($baseQuery, $this->cacheFileBasePath, $this->config);
    }
}
