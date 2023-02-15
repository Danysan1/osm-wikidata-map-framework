<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\Query\StringSetQuery;
use \App\Query\Caching\CachedQuery;

interface CachedStringSetQuery extends CachedQuery, StringSetQuery
{
}
