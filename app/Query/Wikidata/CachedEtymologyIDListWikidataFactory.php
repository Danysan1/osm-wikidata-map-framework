<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\Caching\CSVCachedStringSetXMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Config\Configuration;
use \App\Query\Wikidata\EtymologyIDListXMLWikidataQuery;
use App\ServerTiming;

class CachedEtymologyIDListWikidataFactory implements StringSetXMLQueryFactory
{
    private string $language;
    private string $endpointURL;
    private string $cacheFileBasePath;
    private Configuration $conf;
    private ?ServerTiming $serverTiming;

    public function __construct(string $language, string $endpointURL, string $cacheFileBasePath, Configuration $conf, ?ServerTiming $serverTiming)
    {
        $this->language = $language;
        $this->endpointURL = $endpointURL;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->conf = $conf;
        $this->serverTiming = $serverTiming;
    }

    public function create(StringSet $input): StringSetXMLQuery
    {
        $baseQuery =  new EtymologyIDListXMLWikidataQuery($input, $this->language, $this->endpointURL);
        $cacheTimeoutHours = (int)$this->conf->get("wikidata_cache_timeout_hours");
        $cacheFileBaseURL = (string)$this->conf->get("cache_file_base_url");
        return new CSVCachedStringSetXMLQuery($baseQuery, $this->cacheFileBasePath, $this->serverTiming,  $cacheTimeoutHours, $cacheFileBaseURL);
    }
}
