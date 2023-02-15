<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\Query;

/**
 * Base abstract implementation of a query object.
 */
abstract class BaseQuery implements Query
{
    public function getQueryTypeCode(): string
    {
        $className = get_class($this);
        $startPos = strrpos($className, "\\");
        return substr($className, $startPos ? $startPos + 1 : 0); // class_basename();
    }

    public function __toString(): string
    {
        return get_class($this);
    }
}
