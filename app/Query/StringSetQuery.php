<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\Query;
use \App\StringSet;

/**
 * A query which takes a list of strings and returns a result based on these values.
 */
interface StringSetQuery extends Query {
    /**
     * @return StringSet
     */
    public function getStringSet(): StringSet;
}
