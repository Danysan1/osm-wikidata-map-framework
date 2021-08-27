<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/EtymologyIDListWikidataQuery.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");
require_once(__DIR__ . "/../../StringSet.php");

use \App\Query\StringSetXMLQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\StringSet;
use \App\Query\Wikidata\EtymologyIDListWikidataQuery;

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
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
        return new EtymologyIDListWikidataQuery($input, $this->language, $this->endpointURL);
    }
}
