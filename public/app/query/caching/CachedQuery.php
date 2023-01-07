<?php

namespace App\Query\Caching;

require_once(__DIR__ . "/../Query.php");

use \App\Query\Query;

interface CachedQuery extends Query
{
}
