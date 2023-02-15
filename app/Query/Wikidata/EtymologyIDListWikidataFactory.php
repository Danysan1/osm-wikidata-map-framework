<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Query\Wikidata\EtymologyIDListXMLWikidataQuery;

class EtymologyIDListWikidataFactory implements StringSetXMLQueryFactory
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
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct($language, $endpointURL)
    {
        $this->language = $language;
        $this->endpointURL = $endpointURL;
    }

    public function create(StringSet $input): StringSetXMLQuery
    {
        return new EtymologyIDListXMLWikidataQuery($input, $this->language, $this->endpointURL);
    }
}
