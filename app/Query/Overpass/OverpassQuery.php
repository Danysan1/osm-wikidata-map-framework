<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use App\Query\Query;

interface OverpassQuery extends Query
{
    public function getOverpassQlQuery(): string;
}
