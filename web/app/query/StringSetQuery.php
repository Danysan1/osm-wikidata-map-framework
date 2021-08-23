<?php

namespace App\Query;

require_once(__DIR__."/Query.php");
require_once(__DIR__."/../StringSet.php");

use \App\Query\Query;
use \App\StringSet;

/**
 * A query which takes a list of strings and returns a result based on these values.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface StringSetQuery extends Query {
    /**
     * @return StringSet
     */
    public function getStringSet(): StringSet;
}
