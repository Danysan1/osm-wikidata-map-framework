<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\Caching\CSVCachedStringSetXMLQuery;
use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use App\Config\Wikidata\WikidataConfig;
use App\Query\Wikidata\QueryBuilder\BaseEtymologyIDListWikidataQueryBuilder;
use App\Query\Wikidata\QueryBuilder\FullEtymologyIDListWikidataQueryBuilder;
use App\Query\Wikidata\QueryBuilder\IDListWikidataQueryBuilder;
use App\ServerTiming;

class CachedEtymologyIDListWikidataFactory implements StringSetXMLQueryFactory
{
    private string $language;
    private IDListWikidataQueryBuilder $queryBuilder;
    private WikidataConfig $config;
    private string $cacheFileBasePath;
    private int $cacheTimeoutHours;
    private string $cacheFileBaseURL;
    private ?ServerTiming $serverTiming;

    public function __construct(
        string $language,
        WikidataConfig $config,
        string $cacheFileBasePath,
        string $cacheFileBaseURL,
        int $cacheTimeoutHours,
        bool $eagerFullDownload,
        ?ServerTiming $serverTiming
    ) {
        $this->cacheTimeoutHours = $cacheTimeoutHours;
        $this->cacheFileBaseURL = $cacheFileBaseURL;
        $this->language = $language;
        $this->queryBuilder = $eagerFullDownload ? new FullEtymologyIDListWikidataQueryBuilder() : new BaseEtymologyIDListWikidataQueryBuilder();
        $this->config = $config;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->serverTiming = $serverTiming;
    }

    public function create(StringSet $input): StringSetXMLQuery
    {
        $baseQuery = new EtymologyIDListXMLWikidataQuery(
            $input,
            $this->language,
            $this->queryBuilder->createQuery($input, $this->language),
            $this->config
        );
        return new CSVCachedStringSetXMLQuery(
            $baseQuery,
            $this->cacheFileBasePath,
            $this->serverTiming,
            $this->cacheTimeoutHours,
            $this->cacheFileBaseURL
        );
    }

    public function getLanguage(): ?string
    {
        return $this->language;
    }
}
