<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\Config\Configuration;
use \App\Query\Overpass\RoundRobinOverpassConfig;

class FixedEndpointOverpassConfig extends RoundRobinOverpassConfig
{
    public function __construct(Configuration $conf)
    {
        $endpoint = (string)$conf->get('overpass_endpoint');
        parent::__construct($conf, [$endpoint]);
    }
}
