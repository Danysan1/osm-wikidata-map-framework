<?php

namespace App\Query\Caching;

require_once(__DIR__ . "/../StringSetQuery.php");
require_once(__DIR__ . "/CachedQuery.php");

use \App\Query\StringSetQuery;
use \App\Query\Caching\CachedQuery;

interface CachedStringSetQuery extends CachedQuery, StringSetQuery
{
}
