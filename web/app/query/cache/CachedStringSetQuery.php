<?php

namespace App\Query\Cache;

require_once(__DIR__ . "/../StringSetQuery.php");
require_once(__DIR__ . "/CachedQuery.php");

use \App\Query\StringSetQuery;
use \App\Query\Cache\CachedQuery;

interface CachedStringSetQuery extends CachedQuery, StringSetQuery
{
}
