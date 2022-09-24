<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/RoundRobinOverpassConfig.php");

use App\Configuration;
use \App\Query\Overpass\RoundRobinOverpassConfig;

class FixedEndpointOverpassConfig extends RoundRobinOverpassConfig
{
    public function __construct(Configuration $conf)
    {
        $endpoint = (string)$conf->get('overpass_endpoint');
        parent::__construct($conf, [$endpoint]);
    }
}
